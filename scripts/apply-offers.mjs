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
 * Fail-open by design: missing env vars or any fetch/parse error logs a
 * warning and exits 0 so the site always ships with the hardcoded fallback
 * content from src/fragments.
 *
 * "paused" offers are NOT removed in v1 — the static markup stays in place
 * and a prominent warning lists the pages still showing that casino.
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
  console.log(
    `[offers] feed ok (site: ${feed.site ?? "?"}, updatedAt: ${feed.updatedAt ?? "?"}) — ` +
    `${active.size} active, ${paused.size} paused offer(s)` +
    (Array.isArray(feed.toplists) && feed.toplists.length
      ? `; ${feed.toplists.length} toplist(s) present but ignored in v1`
      : "")
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
  const pausedPages = new Map(); // slug -> Set(pages)
  const matchedSlugs = new Set();
  let filesTouched = 0;

  const MARKER_RE = /<([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*\bdata-offer="([^"]+)"\s+data-offer-field="(bonus|cta)"[^>]*>/g;

  for (const file of walk(DIST)) {
    const page = "/" + relative(DIST, file).split(sep).join("/");
    let html = readFileSync(file, "utf8");
    if (!html.includes("data-offer=")) continue;
    const original = html;

    // Track paused casinos still rendered on this page.
    let m;
    MARKER_RE.lastIndex = 0;
    while ((m = MARKER_RE.exec(html))) {
      const slug = m[2];
      if (paused.has(slug)) {
        if (!pausedPages.has(slug)) pausedPages.set(slug, new Set());
        pausedPages.get(slug).add(page);
      }
      if (active.has(slug) || paused.has(slug)) matchedSlugs.add(slug);
    }

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

    if (html !== original) {
      writeFileSync(file, html, "utf8");
      filesTouched++;
    }
  }

  // --- summary ---------------------------------------------------------------
  console.log(`[offers] ===== Summary =====`);
  console.log(`[offers] files touched: ${filesTouched}`);
  for (const slug of Object.keys(replacements).sort()) {
    const r = replacements[slug];
    console.log(`[offers]   ${slug.padEnd(14)} bonus: ${String(r.bonus).padStart(3)}  cta: ${String(r.cta).padStart(3)}`);
  }

  if (pausedPages.size) {
    console.warn(`[offers] ============================================================`);
    console.warn(`[offers] WARNING: PAUSED offers — v1 does NOT remove cards from the`);
    console.warn(`[offers] page; the static markup is still being shown on:`);
    for (const [slug, pages] of pausedPages) {
      console.warn(`[offers]   ${slug}:`);
      for (const p of [...pages].sort()) console.warn(`[offers]     - ${p}`);
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
