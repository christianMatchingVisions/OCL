/**
 * One-time (idempotent) instrumentation for the editable-text-blocks feed:
 * tags KEY text elements in src/fragments/**\/body.html with stable
 * data-mv-text="<blockKey>" markers so the post-build apply step
 * (scripts/apply-texts.mjs) can swap their inner text in dist/.
 *
 * Tagged per page (when present and unambiguous):
 *   (a) the hero subtitle        -> <p class="hero-sub">      key: <page>-hero-sub
 *   (b) the first intro paragraph of the main content after the hero
 *       (first leaf <p> inside the first .country-text / .prose container
 *       of the first section following the hero)        key: <page>-intro
 *
 * <page> = fragment folder path with "/" -> "-" (e.g. casinos/betsson/resena
 * -> casinos-betsson-resena).
 *
 * Conservative by design (mirrors add-offer-markers.mjs):
 *   - only leaf elements (no child tags) are tagged; ambiguous cases are
 *     skipped and logged, never guessed
 *   - content inside <!-- WC2026:START --> ... <!-- WC2026:END --> fences is
 *     never touched
 *   - elements already carrying data-offer or data-mv-text are skipped
 *   - markup/whitespace/visible text are never altered — only the one data
 *     attribute is inserted
 *
 * Every block tagged (including previously tagged ones, so re-runs keep the
 * file in sync) is also written to the shared seed file
 * ../_wc2026-scratch/text-blocks-seed.json (created or merged, deduped by
 * siteSlug+blockKey) in the dashboard's seed shape:
 *   { siteSlug, blockKey, kind: "marker", pagePath, label, originalText }
 *
 * Usage: node scripts/add-text-markers.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const FRAGMENTS_DIR = join(ROOT, "src", "fragments");
const SEED_FILE = join(ROOT, "..", "_wc2026-scratch", "text-blocks-seed.json");
const SITE_SLUG = "online-casino-latino";
const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------

/** Ranges (start,end) of WC2026 fenced content — never tag inside these. */
function fencedRanges(content) {
  const ranges = [];
  const re = /<!--\s*WC2026:START\s*-->([\s\S]*?)<!--\s*WC2026:END\s*-->/g;
  let m;
  while ((m = re.exec(content))) ranges.push([m.index, m.index + m[0].length]);
  return ranges;
}
const inFence = (ranges, idx) => ranges.some(([s, e]) => idx >= s && idx < e);

/** Decode the handful of entities that occur in these fragments; collapse ws. */
function visibleText(inner) {
  return inner
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&hellip;/g, "…")
    .replace(/\s+/g, " ")
    .trim();
}

/** Insert attrs right after `<tagName` in the opening tag at absolute idx. */
function tagOpeningTag(content, idx, tagName, attrs) {
  const insertAt = idx + tagName.length + 1; // after "<p"
  return content.slice(0, insertAt) + " " + attrs + content.slice(insertAt);
}

/** Human label for a fragment folder ("casinos/betsson/resena" -> "Betsson review"). */
function pageLabel(folder) {
  const tc = (s) =>
    s.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  if (folder === "home") return "Home";
  const review = folder.match(/^casinos\/([a-z0-9-]+)\/resena$/);
  if (review) return `${tc(review[1])} review`;
  return folder.split("/").map(tc).join(" / ");
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry === "body.html") out.push(p);
  }
  return out;
}

// ---------------------------------------------------------------------------

const seedEntries = []; // collected for ALL tagged blocks (new + pre-existing)
const skipped = [];
let heroTagged = 0;
let introTagged = 0;
let fragmentsTouched = 0;

for (const file of walk(FRAGMENTS_DIR)) {
  const rel = relative(FRAGMENTS_DIR, file).split(sep).join("/");
  const folder = rel.replace(/\/body\.html$/, "");
  const pageKey = folder.replace(/\//g, "-");
  const pagePath = folder === "home" ? "/" : `/${folder}/`;
  const label = pageLabel(folder);

  let content = readFileSync(file, "utf8");
  const original = content;

  // --- (a) hero subtitle -----------------------------------------------------
  {
    const key = `${pageKey}-hero-sub`;
    const heroRe = /<p\b[^>]*\bclass="[^"]*\bhero-sub\b[^"]*"[^>]*>/g;
    const fences = fencedRanges(content);
    const hits = [];
    let m;
    while ((m = heroRe.exec(content))) {
      if (!inFence(fences, m.index)) hits.push({ idx: m.index, open: m[0] });
    }
    if (hits.length === 0) {
      skipped.push(`${rel}: no hero subtitle (.hero-sub) outside fences`);
    } else if (hits.length > 1) {
      skipped.push(`${rel}: ${hits.length} .hero-sub elements — ambiguous, skipped`);
    } else {
      const { idx, open } = hits[0];
      const innerStart = idx + open.length;
      const innerEnd = content.indexOf("</p>", innerStart);
      const inner = innerEnd === -1 ? null : content.slice(innerStart, innerEnd);
      if (inner === null || inner.includes("<")) {
        skipped.push(`${rel}: hero subtitle is not a leaf element — skipped`);
      } else if (open.includes("data-offer")) {
        skipped.push(`${rel}: hero subtitle already carries data-offer — skipped`);
      } else {
        if (!open.includes("data-mv-text")) {
          content = tagOpeningTag(content, idx, "p", `data-mv-text="${key}"`);
          heroTagged++;
        }
        seedEntries.push({
          siteSlug: SITE_SLUG,
          blockKey: key,
          kind: "marker",
          pagePath,
          label: `${label} — hero subtitle`,
          originalText: visibleText(inner),
        });
      }
    }
  }

  // --- (b) first intro paragraph after the hero --------------------------------
  intro: {
    const key = `${pageKey}-intro`;
    const fences = fencedRanges(content);

    const heroSec = content.match(/<section\b[^>]*\bclass="[^"]*\bhero\b[^"]*"[^>]*>/);
    if (!heroSec) {
      skipped.push(`${rel}: no hero section — intro skipped`);
      break intro;
    }
    const heroClose = content.indexOf("</section>", heroSec.index);
    if (heroClose === -1) {
      skipped.push(`${rel}: hero section never closes — intro skipped`);
      break intro;
    }
    const nextSecOpen = content.indexOf("<section", heroClose);
    const nextSecClose = nextSecOpen === -1 ? -1 : content.indexOf("</section>", nextSecOpen);
    if (nextSecOpen === -1 || nextSecClose === -1) {
      skipped.push(`${rel}: no content section after the hero — intro skipped`);
      break intro;
    }

    const section = content.slice(nextSecOpen, nextSecClose);
    const container = section.match(/<div\b[^>]*\bclass="(?:country-text|prose)\b[^"]*"[^>]*>/);
    if (!container) {
      skipped.push(`${rel}: first section after hero has no .country-text/.prose intro container — intro skipped`);
      break intro;
    }
    const pRel = section.slice(container.index).match(/<p\b[^>]*>/);
    if (!pRel) {
      skipped.push(`${rel}: intro container has no <p> — intro skipped`);
      break intro;
    }
    const pIdx = nextSecOpen + container.index + pRel.index;
    const open = pRel[0];
    if (inFence(fences, pIdx)) {
      skipped.push(`${rel}: intro paragraph sits inside a WC2026 fence — skipped`);
      break intro;
    }
    const innerStart = pIdx + open.length;
    const innerEnd = content.indexOf("</p>", innerStart);
    const inner = innerEnd === -1 ? null : content.slice(innerStart, innerEnd);
    if (inner === null || inner.includes("<")) {
      skipped.push(`${rel}: first intro paragraph is not a leaf element — skipped`);
      break intro;
    }
    if (open.includes("data-offer")) {
      skipped.push(`${rel}: intro paragraph already carries data-offer — skipped`);
      break intro;
    }
    if (!open.includes("data-mv-text")) {
      content = tagOpeningTag(content, pIdx, "p", `data-mv-text="${key}"`);
      introTagged++;
    }
    seedEntries.push({
      siteSlug: SITE_SLUG,
      blockKey: key,
      kind: "marker",
      pagePath,
      label: `${label} — intro paragraph`,
      originalText: visibleText(inner),
    });
  }

  if (content !== original) {
    fragmentsTouched++;
    if (!DRY_RUN) writeFileSync(file, content, "utf8");
    console.log(`[text-markers] ${rel}: tagged`);
  }
}

// --- seed file (create or merge; dedupe by siteSlug+blockKey) ----------------
let seed = [];
if (existsSync(SEED_FILE)) {
  try {
    const parsed = JSON.parse(readFileSync(SEED_FILE, "utf8"));
    if (Array.isArray(parsed)) seed = parsed;
    else console.warn(`[text-markers] WARNING: seed file is not an array — rewriting`);
  } catch (err) {
    console.warn(`[text-markers] WARNING: seed file unreadable (${err.message}) — rewriting`);
  }
}
const keyOf = (e) => `${e.siteSlug} ${e.blockKey}`;
const ours = new Set(seedEntries.map(keyOf));
seed = [...seed.filter((e) => !ours.has(keyOf(e))), ...seedEntries];
if (!DRY_RUN) {
  mkdirSync(dirname(SEED_FILE), { recursive: true });
  writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2) + "\n", "utf8");
}

// --- summary -----------------------------------------------------------------
console.log(`\n[text-markers] ===== Summary =====${DRY_RUN ? " (dry run — nothing written)" : ""}`);
console.log(`[text-markers] fragments touched this run: ${fragmentsTouched}`);
console.log(`[text-markers] markers added this run: hero-sub ${heroTagged}, intro ${introTagged}`);
console.log(`[text-markers] seed entries written for this site: ${seedEntries.length} (seed file total: ${seed.length})`);
console.log(`[text-markers] seed file: ${SEED_FILE}`);
if (skipped.length) {
  console.log(`[text-markers] skipped (${skipped.length}):`);
  for (const s of skipped) console.log(`[text-markers]   - ${s}`);
}
if (heroTagged === 0 && introTagged === 0) {
  console.log("[text-markers] nothing to do — all identifiable elements already tagged.");
}
