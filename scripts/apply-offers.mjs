/**
 * Post-build offers apply step.
 *
 * Fetches the central dashboard's offer feed (GET {CE_API_URL}/offers with
 * Authorization: Bearer {CE_API_KEY} — same env/auth convention as the
 * content-engine article feed) and rewrites the already-built dist/ HTML:
 *
 *   - elements marked data-offer="<slug>" data-offer-field="bonus"
 *     -> inner text replaced with the offer's bonusText
 *   - anchors marked data-offer="<slug>" data-offer-field="cta"
 *     -> href replaced with the offer's ctaUrl (rel / target / class are
 *        never touched)
 *
 *   - HIDE: an offer with status "paused" has its WHOLE card removed from
 *     every page (the <article class="casino-card"> / <li class="top3-item">
 *     container carrying data-offer-card="<slug>", written by the marker step).
 *     Trailing inter-card whitespace goes with it. A card whose boundary cannot
 *     be resolved safely is LEFT in place and loudly warned — never a blind
 *     delete.
 *   - REORDER: for each feed toplist, if exactly one list container on a page
 *     holds every one of the toplist's slugs, its cards are reordered in DOM
 *     order by entries[].position (ascending); cards not in the toplist keep
 *     their original relative order, after the ranked ones. Ambiguous lists are
 *     skipped and logged — only a clearly-identified container is reordered.
 *
 * Fail-open by design: missing env vars or any fetch/parse error logs a
 * warning and exits 0 so the site always ships with the hardcoded fallback
 * content from src/fragments. The whole step is idempotent — re-running on an
 * already-applied dist is a no-op (paused cards are gone, order is stable).
 *
 * Usage: node scripts/apply-offers.mjs   (runs automatically via `npm run build`)
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const DIST = join(ROOT, "dist");

// --- env (Astro auto-loads .env for the build; this post-build step mimics
// --- that so local `npm run build` behaves like Vercel where the vars are
// --- real environment variables). Existing process env always wins.
function loadDotEnv() {
  const envFile = join(ROOT, ".env");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const val = m[2].replace(/^["']|["']$/g, "");
    if (process.env[m[1]] === undefined) process.env[m[1]] = val;
  }
}

// --- helpers ----------------------------------------------------------------
const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, "&quot;");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

// --- card-boundary helpers --------------------------------------------------
// The marker step (scripts/add-offer-markers.mjs) writes data-offer-card="<slug>"
// on the CARD CONTAINER's opening tag (always <article class="casino-card"> or
// <li class="top3-item ...">). Given the index of that opening tag we walk the
// HTML to the *matching* close tag, counting nested same-name tags so we never
// stop early. Returns {tagName, open:{start,end}, close:{start,end}} or null if
// the boundary can't be determined safely (in which case the caller leaves the
// markup untouched and logs a warning — never a blind delete).
const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "param", "source", "track", "wbr",
]);

function findCardBoundary(html, openTagStart) {
  // openTagStart points at the "<" of the container's opening tag.
  const nameM = /^<([a-zA-Z][a-zA-Z0-9-]*)\b/.exec(html.slice(openTagStart, openTagStart + 40));
  if (!nameM) return null;
  const tagName = nameM[1].toLowerCase();
  const openEnd = html.indexOf(">", openTagStart);
  if (openEnd === -1) return null;
  // Self-closing container (shouldn't happen for article/li) — treat as leaf.
  if (html[openEnd - 1] === "/" || VOID_TAGS.has(tagName)) {
    return { tagName, open: { start: openTagStart, end: openEnd + 1 }, close: { start: openEnd + 1, end: openEnd + 1 } };
  }
  const tagRe = new RegExp(`<(/?)${tagName}\\b[^>]*?(/?)>`, "gi");
  tagRe.lastIndex = openEnd + 1;
  let depth = 1;
  let m;
  while ((m = tagRe.exec(html))) {
    const isClose = m[1] === "/";
    const isSelfClose = m[2] === "/";
    if (isClose) {
      depth--;
      if (depth === 0) {
        return {
          tagName,
          open: { start: openTagStart, end: openEnd + 1 },
          close: { start: m.index, end: m.index + m[0].length },
        };
      }
    } else if (!isSelfClose) {
      depth++;
    }
  }
  return null; // unbalanced — bail, never delete
}

// Locate every card container on a page: data-offer-card markers in DOM order,
// each resolved to its full boundary. Skips any whose boundary can't be found.
function locateCards(html, onAmbiguous) {
  const markerRe = /<(?:article|li)\b[^>]*\bdata-offer-card="([^"]+)"[^>]*>/g;
  const cards = [];
  let m;
  while ((m = markerRe.exec(html))) {
    const slug = m[1];
    const b = findCardBoundary(html, m.index);
    if (!b) {
      onAmbiguous?.(slug, m.index);
      continue;
    }
    cards.push({ slug, start: b.open.start, end: b.close.end });
  }
  return cards;
}

// Expand a [start,end) card span to also swallow the immediately-following
// inter-card whitespace (and a single trailing separator element if present)
// so removal/reordering doesn't leave dangling blank lines. Conservative:
// only pure whitespace and a lone <div class="...separator/divider..."></div>.
function trailingWhitespaceEnd(html, end) {
  let i = end;
  while (i < html.length && /\s/.test(html[i])) i++;
  return i;
}

// --- reorder helpers --------------------------------------------------------
// A "list container" is the element that directly holds card containers. For
// OCL: <ol class="top3-list">, <div class="casino-grid">, <ul class="...">.
// We find each container's boundary, then the cards whose container marker is a
// *direct* child (no other list container intervenes between the container's
// open tag and the card). Returns an array of {start,end (container span),
// cards:[{slug,start,end}]}.
const LIST_CONTAINER_RE =
  /<(ol|ul|div)\b[^>]*\bclass="[^"]*\b(?:top3-list|casino-grid|casino-list|card-grid)\b[^"]*"[^>]*>/g;

function locateListContainers(html) {
  const containers = [];
  let m;
  LIST_CONTAINER_RE.lastIndex = 0;
  while ((m = LIST_CONTAINER_RE.exec(html))) {
    const b = findCardBoundary(html, m.index); // same balanced-walk logic
    if (!b) continue;
    const inner = html.slice(b.open.end, b.close.start);
    // Direct-child cards only: a marker is a direct child if there is no nested
    // list container opening between the container start and that marker. Since
    // card containers (article/li) are never themselves list containers, and
    // OCL never nests casino-grid inside a card, scanning the inner slice for
    // card markers is safe here. (If a nested list container existed we'd still
    // be conservative because the slug-coverage check below would fail.)
    const cards = [];
    const cardRe = /<(?:article|li)\b[^>]*\bdata-offer-card="([^"]+)"[^>]*>/g;
    let cm;
    while ((cm = cardRe.exec(inner))) {
      const cb = findCardBoundary(inner, cm.index);
      if (!cb) continue;
      cards.push({
        slug: cm[1],
        start: b.open.end + cb.open.start,
        end: b.open.end + cb.close.end,
      });
      cardRe.lastIndex = cb.close.end;
    }
    containers.push({ start: b.open.start, end: b.close.end, innerStart: b.open.end, cards });
    LIST_CONTAINER_RE.lastIndex = b.close.end;
  }
  return containers;
}

// Reorder one toplist on a page. orderBySlug: Map(slug -> position).
// Returns { html, order } on success, { html:null, reason } when skipped,
// { html:null } when this toplist simply doesn't apply to any container here.
function reorderToplistOnPage(html, orderBySlug) {
  const wantSlugs = new Set(orderBySlug.keys());
  const containers = locateListContainers(html);

  // Candidate = a container that this toplist CLEARLY identifies: every card in
  // the container is named by the toplist AND every toplist slug is present.
  // i.e. the toplist's slug set EQUALS the container's card-slug set. This is
  // the conservative rule the task requires — a 3-entry toplist will only
  // reorder a 3-card list, never the front of a 14-card grid that merely
  // happens to contain those 3 brands. Anything looser is left untouched.
  const setEq = (c) => {
    if (c.cards.length < 2) return false;
    const present = new Set(c.cards.map((x) => x.slug));
    if (present.size !== wantSlugs.size) return false;
    for (const s of wantSlugs) if (!present.has(s)) return false;
    return true;
  };
  const candidates = containers.filter(setEq);

  if (candidates.length === 0) {
    // No container's card-set EXACTLY equals the toplist. If the toplist's slugs
    // are nonetheless a partial subset of some grid, reordering would mean
    // shuffling a few ranked cards through a larger list whose remaining order
    // we have no mandate over — too risky. Skip + log so it's visible.
    const subsetOf = containers.filter((c) => {
      const present = new Set(c.cards.map((x) => x.slug));
      let hit = 0;
      for (const s of wantSlugs) if (present.has(s)) hit++;
      return hit === wantSlugs.size && c.cards.length > wantSlugs.size;
    });
    if (subsetOf.length) {
      return { html: null, reason: `toplist is a ${wantSlugs.size}-slug subset of a larger list (${subsetOf[0].cards.length} cards) — no list this toplist exactly identifies; skipped` };
    }
    return { html: null }; // toplist genuinely not on this page
  }
  if (candidates.length > 1) {
    return { html: null, reason: `ambiguous — ${candidates.length} containers exactly match the toplist slug set` };
  }
  const container = candidates[0];

  // Guard against duplicate slugs inside the chosen container (e.g. the same
  // casino card appearing twice): reordering would be ill-defined. Skip.
  const seen = new Set();
  for (const c of container.cards) {
    if (wantSlugs.has(c.slug)) {
      if (seen.has(c.slug)) {
        return { html: null, reason: `duplicate "${c.slug}" card in container — cannot reorder safely` };
      }
      seen.add(c.slug);
    }
  }

  // Stable reorder: ranked cards first (by position asc), then the rest in
  // their original relative order. We reorder the *content slices* of the cards
  // while keeping the inter-card separators (whitespace) in their slots, so the
  // container's formatting is preserved.
  const cards = container.cards;
  const ranked = cards
    .filter((c) => orderBySlug.has(c.slug))
    .sort((a, b) => orderBySlug.get(a.slug) - orderBySlug.get(b.slug));
  const rest = cards.filter((c) => !orderBySlug.has(c.slug));
  const newOrder = [...ranked, ...rest];

  // No-op? (already in desired order)
  if (newOrder.every((c, i) => c === cards[i])) {
    return { html: null }; // already ordered — nothing to write
  }

  // The "slots" are the byte ranges each card occupies. We keep slot positions
  // and the gaps (separators/whitespace) between them fixed, and drop the card
  // HTML into the slots in the new order.
  const slotTexts = cards.map((c) => html.slice(c.start, c.end));
  const orderIdx = newOrder.map((c) => cards.indexOf(c));

  let rebuilt = html.slice(0, cards[0].start);
  for (let i = 0; i < cards.length; i++) {
    rebuilt += slotTexts[orderIdx[i]];
    // gap to next slot (or to container content end after the last card)
    const gapStart = cards[i].end;
    const gapEnd = i + 1 < cards.length ? cards[i + 1].start : null;
    if (gapEnd != null) rebuilt += html.slice(gapStart, gapEnd);
    else rebuilt += html.slice(cards[cards.length - 1].end);
  }
  return { html: rebuilt, order: newOrder.map((c) => c.slug) };
}

/**
 * Run the apply step. Always resolves (never throws) — the build must not
 * fail because of the offers feed. Exported so the test harness can run it
 * in-process.
 */
export async function applyOffers({ apiUrl, apiKey } = {}) {
  loadDotEnv();
  const API_URL = apiUrl ?? process.env.CE_API_URL;
  const API_KEY = apiKey ?? process.env.CE_API_KEY;

  if (!API_URL || !API_KEY) {
    console.log("[offers] feed not configured, skipping");
    return;
  }

  // --- fetch feed (never fail the build) ------------------------------------
  let feed;
  try {
    const url = `${API_URL.replace(/\/$/, "")}/offers`;
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    feed = await res.json();
    if (!Array.isArray(feed.offers)) throw new Error("malformed feed: no offers[]");
  } catch (err) {
    console.warn(`[offers] WARNING: feed fetch failed (${err.message}) — keeping hardcoded fallback content, build continues.`);
    return;
  }

  const active = new Map(); // slug -> offer
  const paused = new Map(); // slug -> offer
  for (const offer of feed.offers) {
    if (!offer || !offer.casinoSlug) continue;
    if (offer.status === "active") active.set(offer.casinoSlug, offer);
    else if (offer.status === "paused") paused.set(offer.casinoSlug, offer);
  }
  const toplists = Array.isArray(feed.toplists) ? feed.toplists : [];
  console.log(
    `[offers] feed ok (site: ${feed.site ?? "?"}, updatedAt: ${feed.updatedAt ?? "?"}) — ` +
    `${active.size} active, ${paused.size} paused offer(s)` +
    (toplists.length ? `; ${toplists.length} toplist(s)` : "")
  );

  if (!existsSync(DIST)) {
    console.warn("[offers] WARNING: dist/ not found — run astro build first. Skipping.");
    return;
  }

  // --- apply -----------------------------------------------------------------
  const replacements = {}; // slug -> {bonus, cta}
  const bump = (slug, field) => {
    replacements[slug] ??= { bonus: 0, cta: 0 };
    replacements[slug][field]++;
  };
  const removedPages = new Map();   // slug -> Set(pages) where card was removed
  const pausedNoBoundary = new Map(); // slug -> Set(pages) paused but boundary unsafe
  const matchedSlugs = new Set();
  const reorderLog = [];            // human-readable per-list reorder outcomes
  let filesTouched = 0;
  let cardsRemoved = 0;
  let listsReordered = 0;

  const MARKER_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\bdata-offer="([^"]+)"\s+data-offer-field="(bonus|cta)"[^>]*>/g;

  for (const file of walk(DIST)) {
    const page = "/" + relative(DIST, file).split(sep).join("/");
    let html = readFileSync(file, "utf8");
    if (!html.includes("data-offer=")) continue;
    const original = html;

    // ----- PASS 1: HIDE paused casinos (remove the whole card container) -----
    // Walk every data-offer-card marker; if its slug is paused, resolve the
    // card's full boundary and splice it (plus trailing inter-card whitespace)
    // out. Ambiguous/unbalanced boundaries are LEFT in place and logged — never
    // a blind delete. Idempotent: a second run simply finds no paused markers.
    if (paused.size && html.includes("data-offer-card=")) {
      const cards = locateCards(html, (slug) => {
        if (!paused.has(slug)) return;
        if (!pausedNoBoundary.has(slug)) pausedNoBoundary.set(slug, new Set());
        pausedNoBoundary.get(slug).add(page);
      });
      // Build the removal ranges (sorted, then splice right-to-left so earlier
      // offsets stay valid).
      const toRemove = cards
        .filter((c) => paused.has(c.slug))
        .map((c) => ({ slug: c.slug, start: c.start, end: trailingWhitespaceEnd(html, c.end) }))
        .sort((a, b) => b.start - a.start);
      for (const r of toRemove) {
        html = html.slice(0, r.start) + html.slice(r.end);
        cardsRemoved++;
        matchedSlugs.add(r.slug);
        if (!removedPages.has(r.slug)) removedPages.set(r.slug, new Set());
        removedPages.get(r.slug).add(page);
      }
    }

    // Track active/paused slugs that have markers on this page (for the
    // "feed slug matched nothing" warning). Paused ones that survived removal
    // (no card boundary) are surfaced separately above.
    let m;
    MARKER_RE.lastIndex = 0;
    while ((m = MARKER_RE.exec(html))) {
      const slug = m[2];
      if (active.has(slug) || paused.has(slug)) matchedSlugs.add(slug);
    }

    // ----- PASS 2: bonus/cta overrides on the (post-hide) html ---------------
    // Replace. We rebuild the file into `out`, copying untouched slices.
    let out = "";
    let cursor = 0;
    MARKER_RE.lastIndex = 0;
    while ((m = MARKER_RE.exec(html))) {
      if (m.index < cursor) continue; // marker inside an already-replaced region
      const [openTag, tagName, slug, field] = m;
      const offer = active.get(slug);
      if (!offer) continue; // paused or unknown -> leave untouched

      if (field === "bonus") {
        if (typeof offer.bonusText !== "string" || !offer.bonusText.trim()) continue;
        // Treat the tagged element as a leaf: replace its entire inner content.
        const innerStart = m.index + openTag.length;
        const closeIdx = html.indexOf(`</${tagName}>`, innerStart);
        if (closeIdx === -1) continue;
        out += html.slice(cursor, innerStart) + escapeHtml(offer.bonusText.trim());
        cursor = closeIdx;
        bump(slug, "bonus");
      } else if (field === "cta") {
        if (typeof offer.ctaUrl !== "string" || !/^https?:\/\//i.test(offer.ctaUrl)) continue;
        const newOpen = openTag.replace(
          /\bhref="[^"]*"/,
          `href="${escapeAttr(offer.ctaUrl)}"`
        );
        if (newOpen === openTag) continue;
        out += html.slice(cursor, m.index) + newOpen;
        cursor = m.index + openTag.length;
        bump(slug, "cta");
      }
    }
    out += html.slice(cursor);
    html = out;

    // ----- PASS 3: REORDER cards within a clearly-identified list container --
    // For each feed toplist we look for ONE list container on this page whose
    // direct card children (data-offer-card) cover the toplist's slugs. We only
    // reorder when the match is unambiguous (exactly one such container, and
    // every toplist slug is present in it). Cards in the toplist are reordered
    // by entries[].position (ascending); cards NOT in the toplist keep their
    // original relative order, after the ranked ones. Conservative by design:
    // anything ambiguous is skipped + logged, never reordered.
    if (toplists.length && html.includes("data-offer-card=")) {
      for (const tl of toplists) {
        const entries = Array.isArray(tl.entries) ? tl.entries : [];
        if (!entries.length) continue;
        const orderBySlug = new Map(); // slug -> position
        for (const e of entries) {
          if (e && e.casinoSlug != null && Number.isFinite(e.position)) {
            orderBySlug.set(e.casinoSlug, e.position);
          }
        }
        if (!orderBySlug.size) continue;

        const r = reorderToplistOnPage(html, orderBySlug);
        if (r.html != null) {
          html = r.html;
          listsReordered++;
          reorderLog.push(`${page}: "${tl.key}" -> ${r.order.join(" > ")}`);
        } else if (r.reason) {
          reorderLog.push(`${page}: "${tl.key}" SKIPPED (${r.reason})`);
        }
      }
    }

    if (html !== original) {
      writeFileSync(file, html, "utf8");
      filesTouched++;
    }
  }

  // --- summary ---------------------------------------------------------------
  console.log(`[offers] ===== Summary =====`);
  console.log(`[offers] files touched: ${filesTouched}`);
  console.log(`[offers] cards removed (paused): ${cardsRemoved}  |  lists reordered: ${listsReordered}`);
  for (const slug of Object.keys(replacements).sort()) {
    const r = replacements[slug];
    console.log(`[offers]   ${slug.padEnd(14)} bonus: ${String(r.bonus).padStart(3)}  cta: ${String(r.cta).padStart(3)}`);
  }

  if (removedPages.size) {
    console.log(`[offers] ----- HIDE: paused casinos removed from -----`);
    for (const [slug, pages] of removedPages) {
      console.log(`[offers]   ${slug}:`);
      for (const p of [...pages].sort()) console.log(`[offers]     - ${p}`);
    }
  }

  if (reorderLog.length) {
    console.log(`[offers] ----- REORDER -----`);
    for (const line of reorderLog) console.log(`[offers]   ${line}`);
  }

  // Paused offers whose card boundary could NOT be determined safely: the card
  // is intentionally LEFT in place (no blind delete) and surfaced loudly.
  if (pausedNoBoundary.size) {
    console.warn(`[offers] ============================================================`);
    console.warn(`[offers] WARNING: paused offer(s) with NO safe card boundary — card`);
    console.warn(`[offers] left in place (not deleted). Check the markup on:`);
    for (const [slug, pages] of pausedNoBoundary) {
      // Only warn for pages where the card actually survived (wasn't also
      // removed via a separate, well-formed marker on the same page).
      const stillThere = [...pages].filter((p) => !(removedPages.get(slug)?.has(p)));
      if (!stillThere.length) continue;
      console.warn(`[offers]   ${slug}:`);
      for (const p of stillThere.sort()) console.warn(`[offers]     - ${p}`);
    }
    console.warn(`[offers] ============================================================`);
  }

  const unmatched = [...active.keys(), ...paused.keys()].filter((s) => !matchedSlugs.has(s));
  if (unmatched.length) {
    console.warn(`[offers] WARNING: feed slugs with no matching markers in dist: ${unmatched.sort().join(", ")}`);
  }
}

// CLI entry point (skipped when imported by the test harness).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await applyOffers();
  process.exit(0);
}
