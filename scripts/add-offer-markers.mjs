/**
 * One-time (idempotent) instrumentation: adds stable data-offer markers to the
 * hardcoded casino cards inside src/fragments so the post-build offers feed
 * (scripts/apply-offers.mjs) can swap bonus text + CTA links in dist/.
 *
 *   data-offer="<slug>" data-offer-field="bonus"  -> on the leaf bonus-text element
 *   data-offer="<slug>" data-offer-field="cta"    -> on the outbound CTA anchor
 *
 * Conservative by design: a card is only tagged when every available signal
 * (review link, logo file, casino name, CTA domain) agrees on one canonical
 * slug. Anything ambiguous or non-canonical is skipped and logged.
 * Markup, whitespace and visible text are never altered — only the two data
 * attributes are inserted. Elements already tagged are skipped (idempotent).
 * Content inside <!-- WC2026:START --> ... <!-- WC2026:END --> fences is
 * never touched.
 *
 * Usage: node scripts/add-offer-markers.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const FRAGMENTS_DIR = join(ROOT, "src", "fragments");
const DRY_RUN = process.argv.includes("--dry-run");

/**
 * Canonical slugs.
 *  - The original 15 are folder names under src/fragments/casinos/ (they also
 *    have /resena/ review pages).
 *  - The additional 23 are brands that appear on home / /casinos / /bonos and
 *    the 7 country pages but have NO review folder. They are registered as
 *    site_offers (scripts/seed-offers-ocl-extra.mjs in the engine repo) and are
 *    identified here purely by casino-name + logo filename (their CTA hosts are
 *    shared affiliate domains, intentionally kept out of DOMAIN_MAP).
 */
const CANONICAL_SLUGS = new Set([
  // original 15 (with /resena/ pages)
  "22bet", "betsson", "bitsler", "jackpotcity", "jackpoty", "leovegas",
  "lvbet", "mr-bet", "mystake", "nomini", "nova-jackpot", "rivalo",
  "stake", "talismania", "ultra-casino",
  // additional 23 (no review pages — name + logo identity only)
  "1go", "amunra", "apuestarey", "betano", "betobet", "beteum", "casinia",
  "casino-universe", "codere", "dragonia", "dude-spin", "fortunazo", "frumzi",
  "izzi", "jugabet", "magicred", "novibet", "posido", "rabona", "robocat",
  "spin-casino", "tiki-casino", "tonybet",
]);

/** Normalized casino display name -> slug (country suffixes stripped first). */
const NAME_MAP = new Map([
  ["ultra casino", "ultra-casino"],
  ["nova jackpot", "nova-jackpot"],
  ["talismania", "talismania"],
  ["22bet", "22bet"],
  ["22bet casino", "22bet"],
  ["stake", "stake"],
  ["stake casino", "stake"],
  ["jackpotcity", "jackpotcity"],
  ["jackpot city", "jackpotcity"],
  ["jackpoty", "jackpoty"],
  ["bitsler", "bitsler"],
  ["leovegas", "leovegas"],
  ["betsson", "betsson"],
  ["mr bet", "mr-bet"],
  ["mr. bet", "mr-bet"],
  ["mystake", "mystake"],
  ["nomini", "nomini"],
  ["rivalo", "rivalo"],
  ["lvbet", "lvbet"],
  // --- additional 23 brands (normalized card names -> slug) ---------------
  ["1go casino", "1go"],
  ["1go", "1go"],
  ["amunra", "amunra"],
  ["amun ra", "amunra"],
  ["apuestarey", "apuestarey"],
  ["betano", "betano"],
  ["betano casino", "betano"],
  ["betobet", "betobet"],
  ["beteum", "beteum"],
  ["casinia", "casinia"],
  ["casino universe", "casino-universe"],
  ["codere", "codere"],
  ["dragonia", "dragonia"],
  ["dude spin", "dude-spin"],
  ["fortunazo", "fortunazo"],
  ["frumzi", "frumzi"],
  ["izzi", "izzi"],
  ["izzi casino", "izzi"],
  ["jugabet", "jugabet"],
  ["magicred", "magicred"],
  ["magic red", "magicred"],
  ["novibet", "novibet"],
  ["posido", "posido"],
  ["rabona", "rabona"],
  ["robocat", "robocat"],
  ["spin casino", "spin-casino"],
  ["tiki casino", "tiki-casino"],
  ["tiki", "tiki-casino"],
  ["tonybet", "tonybet"],
  ["tony bet", "tonybet"],
]);

/** Country words stripped from the end of card names ("Talismania México"). */
const COUNTRY_SUFFIXES = [
  "mexico", "méxico", "peru", "perú", "chile", "colombia", "argentina",
  "venezuela", "ecuador",
];

/** Logo filename -> slug. */
const LOGO_MAP = new Map([
  ["ultra-casino-logo.jpg", "ultra-casino"],
  ["novajackpot-logo.jpg", "nova-jackpot"],
  ["talismania-logo.jpg", "talismania"],
  ["22-bet-casino-logo.jpg", "22bet"],
  ["stake.com-casino-logo.jpg", "stake"],
  ["jackpotcity.png", "jackpotcity"],
  ["jackpoty-logo.jpg", "jackpoty"],
  ["bitsler-casino-logo.jpeg", "bitsler"],
  ["leovegas-logo.jpg", "leovegas"],
  ["betsson-logo.png", "betsson"],
  ["mr-bet-logo.png", "mr-bet"],
  ["mystake-logo.png", "mystake"],
  ["nomini-casino-logo.png", "nomini"],
  ["rivalo-casino-logo.jpg", "rivalo"],
  ["lvbet-logo.png", "lvbet"],
  // --- additional 23 brands (logo filename, lowercased -> slug) -----------
  ["1go.png", "1go"],
  ["amunra.png", "amunra"],
  ["apuestarey.png", "apuestarey"],
  ["betano.png", "betano"],
  ["betobet-casino-logo.jpg", "betobet"],
  ["beteum.png", "beteum"],
  ["casinia.png", "casinia"],
  ["casinia.jpg", "casinia"],
  ["casino-universe.png", "casino-universe"],
  ["codere-logo.png", "codere"],
  ["dragonia.png", "dragonia"],
  ["dude-spin.png", "dude-spin"],
  ["fortunazo.png", "fortunazo"],
  ["frumzi.png", "frumzi"],
  ["izzi.png", "izzi"],
  ["jugabet.png", "jugabet"],
  ["magicred.png", "magicred"],
  ["novibet.png", "novibet"],
  ["posido.png", "posido"],
  ["rabona.png", "rabona"],
  ["robocat.png", "robocat"],
  ["spin-casino.png", "spin-casino"],
  ["tiki.png", "tiki-casino"],
  ["tonybet.png", "tonybet"],
]);

/**
 * CTA hostname -> slug. ONLY unambiguous domains (one casino per domain).
 * NOTE: media.vegaslegends.com, *.lynmonkel.com, grwptraq.com etc. serve
 * multiple brands and are deliberately NOT listed.
 */
const DOMAIN_MAP = new Map([
  ["22betpartners.com", "22bet"],
  ["stake.com", "stake"],
  ["jackpotcitycasino.com", "jackpotcity"],
  ["highaffiliates.com", "jackpoty"],
  ["bitsler.com", "bitsler"],
  ["leovegas.com", "leovegas"],
  ["betsson.co", "betsson"],
  ["betsson.com", "betsson"],
  ["mr.bet", "mr-bet"],
  ["nmn.servclick1move.com", "nomini"],
  ["rivalo.com", "rivalo"],
  ["lvbetpartners.com", "lvbet"],
  ["ultracasino.com", "ultra-casino"],
  ["hub.buzzaffiliates.com", "nova-jackpot"],
  ["affiliatemystake.com", "mystake"],
  ["mystake.com", "mystake"],
]);

// ---------------------------------------------------------------------------

function normalizeName(raw) {
  let n = raw
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/[^\p{L}\p{N}. ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  for (const c of COUNTRY_SUFFIXES) {
    if (n.endsWith(" " + c)) n = n.slice(0, -(c.length + 1)).trim();
  }
  return n;
}

function slugFromHref(href) {
  if (!href || !/^https?:\/\//i.test(href)) return null;
  let host;
  try {
    host = new URL(href).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  for (const [domain, slug] of DOMAIN_MAP) {
    if (host === domain || host.endsWith("." + domain)) return slug;
  }
  return null;
}

/** Ranges (start,end) of WC2026 fenced content — never tag inside these. */
function fencedRanges(content) {
  const ranges = [];
  const re = /<!--\s*WC2026:START\s*-->([\s\S]*?)<!--\s*WC2026:END\s*-->/g;
  let m;
  while ((m = re.exec(content))) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}
const inFence = (ranges, idx) => ranges.some(([s, e]) => idx >= s && idx < e);

/** Find blocks `<tag class~=cls ...> ... </tag>` (no nesting of same tag). */
function findBlocks(content, tag, cls) {
  const blocks = [];
  const openRe = new RegExp(`<${tag}\\b[^>]*\\bclass="[^"]*\\b${cls}\\b[^"]*"[^>]*>`, "g");
  let m;
  while ((m = openRe.exec(content))) {
    const end = content.indexOf(`</${tag}>`, m.index);
    if (end === -1) continue;
    blocks.push({ start: m.index, end: end + tag.length + 3 });
  }
  return blocks;
}

/**
 * Collect identity signals inside a card block; return slug or null.
 * Identity comes from review link / logo / casino name. The CTA href domain
 * is only used as a fallback when no other signal exists — a mismatching CTA
 * domain (a real content bug we found in the wild) must not poison the card
 * identity; the CTA itself is separately guarded and skipped on mismatch.
 */
function detectSlug(block, log) {
  const signals = new Map(); // slug -> [signal names]
  const add = (slug, what) => {
    if (!slug) return;
    if (!signals.has(slug)) signals.set(slug, []);
    signals.get(slug).push(what);
  };

  const review = block.match(/href="\/casinos\/([a-z0-9-]+)\/resena\//);
  if (review && CANONICAL_SLUGS.has(review[1])) add(review[1], "review-link");

  const logo = block.match(/src="\/logos\/([^"]+)"/);
  if (logo) add(LOGO_MAP.get(logo[1].toLowerCase()) ?? null, "logo");

  const name = block.match(/class="(?:casino-name|top3-name)"[^>]*>([^<]+)</);
  if (name) add(NAME_MAP.get(normalizeName(name[1])) ?? null, "name");

  if (signals.size === 0) {
    // Fallback only: identify by CTA domain.
    const ctaRe = /<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>/g;
    let cm;
    while ((cm = ctaRe.exec(block))) add(slugFromHref(cm[1]), "cta-domain");
  }

  const slugs = [...signals.keys()];
  if (slugs.length === 1) return slugs[0];
  if (slugs.length > 1) {
    log.conflicts.add(
      `conflicting signals ${slugs.map((s) => `${s}(${signals.get(s).join(",")})`).join(" vs ")}`
    );
    return null;
  }
  const label = name ? name[1].trim() : "(unidentified card)";
  log.nonCanonical.add(label);
  return null;
}

/** Insert attrs right after `<tagName ` in the opening tag at absolute idx. */
function tagOpeningTag(content, idx, tagName, attrs) {
  const insertAt = idx + tagName.length + 1; // after "<div" / "<a"
  return content.slice(0, insertAt) + " " + attrs + content.slice(insertAt);
}

// ---------------------------------------------------------------------------

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry === "body.html") out.push(p);
  }
  return out;
}

const files = walk(FRAGMENTS_DIR);
const totals = {}; // slug -> {bonus, cta, card}
const bump = (slug, field) => {
  totals[slug] ??= { bonus: 0, cta: 0, card: 0 };
  totals[slug][field]++;
};
let fragmentsTouched = 0;
const globalLog = { conflicts: [], nonCanonical: new Set(), pagesSkipped: [] };

for (const file of files) {
  const rel = relative(FRAGMENTS_DIR, file).split(sep).join("/");
  let content = readFileSync(file, "utf8");
  const original = content;
  const fileLog = { conflicts: new Set(), nonCanonical: new Set() };
  const fileCounts = {}; // slug -> {bonus,cta}
  const fbump = (slug, field) => {
    fileCounts[slug] ??= { bonus: 0, cta: 0, card: 0 };
    fileCounts[slug][field]++;
    bump(slug, field);
  };

  // Review pages: the whole fragment belongs to one casino (folder name).
  const reviewMatch = rel.match(/^casinos\/([a-z0-9-]+)\/resena\/body\.html$/);
  const pageSlug =
    reviewMatch && CANONICAL_SLUGS.has(reviewMatch[1]) ? reviewMatch[1] : null;

  // Process card-like blocks (casino-card articles + top3-item list items).
  // We re-scan after each mutation since offsets shift.
  const blockSpecs = [
    { tag: "article", cls: "casino-card" },
    { tag: "li", cls: "top3-item" },
  ];

  for (const { tag, cls } of blockSpecs) {
    let safety = 0;
    let madeChange = true;
    while (madeChange && safety++ < 500) {
      madeChange = false;
      const fences = fencedRanges(content);
      for (const { start, end } of findBlocks(content, tag, cls)) {
        if (inFence(fences, start) || inFence(fences, end)) continue;
        const block = content.slice(start, end);
        const slug = detectSlug(block, fileLog);
        if (!slug) continue;

        // 0) card-boundary marker on the container's opening tag itself. This
        // is what the apply step (scripts/apply-offers.mjs) walks to so it can
        // HIDE a paused casino's whole card and REORDER cards within a list.
        // Inert: a single data attribute, never altering layout/visible text.
        const openTagEnd = content.indexOf(">", start);
        const openTag = content.slice(start, openTagEnd + 1);
        if (!openTag.includes("data-offer-card")) {
          content = tagOpeningTag(
            content, start, tag, `data-offer-card="${slug}"`
          );
          fbump(slug, "card");
          madeChange = true;
          break; // offsets shifted — rescan
        }

        // 1) bonus leaf: <div class="bonus-amount"> or <div class="top3-bonus">
        const bonusRe = /<div\b[^>]*\bclass="(?:bonus-amount|top3-bonus)"[^>]*>/g;
        let bm;
        while ((bm = bonusRe.exec(block))) {
          if (bm[0].includes("data-offer")) continue;
          content = tagOpeningTag(
            content, start + bm.index, "div",
            `data-offer="${slug}" data-offer-field="bonus"`
          );
          fbump(slug, "bonus");
          madeChange = true;
          break; // offsets shifted — rescan
        }
        if (madeChange) break;

        // 2) outbound CTA anchors with an external href
        const aRe = /<a\b[^>]*>/g;
        let am;
        while ((am = aRe.exec(block))) {
          const open = am[0];
          if (open.includes("data-offer")) continue;
          const href = open.match(/\bhref="([^"]+)"/);
          if (!href || !/^https?:\/\//i.test(href[1])) continue;
          if (!/\bclass="[^"]*\b(?:cta-btn|top3-cta)\b/.test(open)) continue;
          // Never tag a CTA whose domain maps to a DIFFERENT casino.
          const domSlug = slugFromHref(href[1]);
          if (domSlug && domSlug !== slug) {
            fileLog.conflicts.add(
              `card identified as "${slug}" but CTA href domain maps to "${domSlug}" (${href[1]}) — CTA left untagged, check the link`
            );
            continue;
          }
          content = tagOpeningTag(
            content, start + am.index, "a",
            `data-offer="${slug}" data-offer-field="cta"`
          );
          fbump(slug, "cta");
          madeChange = true;
          break;
        }
        if (madeChange) break;
      }
    }
  }

  // Review-page standalone CTAs (outside any card block).
  if (pageSlug) {
    let safety = 0;
    let madeChange = true;
    while (madeChange && safety++ < 100) {
      madeChange = false;
      const fences = fencedRanges(content);
      const aRe = /<a\b[^>]*>/g;
      let am;
      while ((am = aRe.exec(content))) {
        const open = am[0];
        if (inFence(fences, am.index)) continue;
        if (open.includes("data-offer")) continue;
        if (!/\bclass="[^"]*\b(?:cta-btn|top3-cta)\b/.test(open)) continue;
        const href = open.match(/\bhref="([^"]+)"/);
        if (!href || !/^https?:\/\//i.test(href[1])) continue;
        const domSlug = slugFromHref(href[1]);
        if (domSlug && domSlug !== pageSlug) {
          fileLog.conflicts.add(
            `review page ${rel}: CTA domain maps to ${domSlug}, expected ${pageSlug} — skipped`
          );
          continue;
        }
        content = tagOpeningTag(
          content, am.index, "a",
          `data-offer="${pageSlug}" data-offer-field="cta"`
        );
        fbump(pageSlug, "cta");
        madeChange = true;
        break;
      }
    }
  }

  // Juegos game-showcase CTAs (src/fragments/juegos/body.html). These outbound
  // brand links live in <a class="play-btn"> anchors inside <div class="game-
  // card"> blocks — they are NOT casino-card / top3-item, so the block scan
  // above never reaches them. The brand is identified from the anchor's visible
  // text ("Jugar en <Brand>") via NAME_MAP, and (when the CTA host is an
  // unambiguous single-brand domain) cross-checked against the link domain.
  // Shared affiliate hosts (e.g. media.vegaslegends.com for Talismania) are not
  // in DOMAIN_MAP, so for those we trust the link text only. Only the cta field
  // is tagged (these inline CTAs carry no bonus element). rel / target / class
  // are never modified — we only insert the two data-offer attributes.
  if (rel === "juegos/body.html") {
    let safety = 0;
    let madeChange = true;
    while (madeChange && safety++ < 200) {
      madeChange = false;
      const fences = fencedRanges(content);
      // <a ... class="...play-btn..." ...>Jugar en <Brand></a>
      const aRe = /<a\b[^>]*\bclass="[^"]*\bplay-btn\b[^"]*"[^>]*>([^<]*)<\/a>/g;
      let am;
      while ((am = aRe.exec(content))) {
        const open = am[0].slice(0, am[0].indexOf(">") + 1);
        const label = am[1];
        if (inFence(fences, am.index)) continue;
        if (open.includes("data-offer")) continue;
        const href = open.match(/\bhref="([^"]+)"/);
        if (!href || !/^https?:\/\//i.test(href[1])) continue;
        // Brand from "Jugar en <Brand>" label.
        const brand = label.match(/jugar\s+en\s+(.+)$/i)?.[1] ?? label;
        const slug = NAME_MAP.get(normalizeName(brand)) ?? null;
        if (!slug || !CANONICAL_SLUGS.has(slug)) {
          fileLog.nonCanonical.add(brand.trim() || "(unlabelled play-btn)");
          continue;
        }
        // If the host IS an unambiguous single-brand domain, it must agree.
        const domSlug = slugFromHref(href[1]);
        if (domSlug && domSlug !== slug) {
          fileLog.conflicts.add(
            `juegos play-btn labelled "${brand.trim()}" (${slug}) but CTA domain maps to "${domSlug}" (${href[1]}) — skipped`
          );
          continue;
        }
        content = tagOpeningTag(
          content, am.index, "a",
          `data-offer="${slug}" data-offer-field="cta"`
        );
        fbump(slug, "cta");
        madeChange = true;
        break;
      }
    }
  }

  if (content !== original) {
    fragmentsTouched++;
    if (!DRY_RUN) writeFileSync(file, content, "utf8");
    const parts = Object.entries(fileCounts)
      .map(([s, c]) => `${s} (card:${c.card} bonus:${c.bonus} cta:${c.cta})`)
      .join(", ");
    console.log(`[markers] ${rel}: ${parts}`);
  }
  for (const c of fileLog.conflicts) globalLog.conflicts.push(`${rel}: ${c}`);
  for (const n of fileLog.nonCanonical) globalLog.nonCanonical.add(n);
}

console.log("\n[markers] ===== Summary =====");
console.log(`[markers] fragments touched: ${fragmentsTouched}${DRY_RUN ? " (dry run — nothing written)" : ""}`);
const slugs = Object.keys(totals).sort();
for (const s of slugs) {
  console.log(`[markers]   ${s.padEnd(14)} card: ${String(totals[s].card).padStart(2)}  bonus: ${String(totals[s].bonus).padStart(2)}  cta: ${String(totals[s].cta).padStart(2)}`);
}
const tcard = slugs.reduce((n, s) => n + totals[s].card, 0);
const tb = slugs.reduce((n, s) => n + totals[s].bonus, 0);
const tc = slugs.reduce((n, s) => n + totals[s].cta, 0);
console.log(`[markers]   total markers added this run: card ${tcard}, bonus ${tb}, cta ${tc}`);
if (globalLog.nonCanonical.size) {
  console.log(`[markers] skipped (not a canonical casino): ${[...globalLog.nonCanonical].sort().join(", ")}`);
}
if (globalLog.conflicts.length) {
  console.log(`[markers] skipped (conflicting signals):`);
  for (const c of globalLog.conflicts) console.log(`[markers]   - ${c}`);
}
if (tcard === 0 && tb === 0 && tc === 0) {
  console.log("[markers] nothing to do — all identifiable elements already tagged.");
}
