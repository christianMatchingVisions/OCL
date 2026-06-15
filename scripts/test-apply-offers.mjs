/**
 * End-to-end test for scripts/apply-offers.mjs.
 *
 * 1. Builds the site fresh (astro build only, no apply step).
 * 2. Serves a mock offers feed on localhost:
 *      - Betsson: active, sentinel bonus + sentinel CTA (override test);
 *      - mr-bet: "paused" (HIDE test — card must be GONE everywhere);
 *      - a toplist "top3-home" reordering the home Top-3 list (REORDER test).
 * 3. Runs the apply step against the mock feed.
 * 4. Asserts:
 *      (override) the sentinel bonus appears on EVERY page that had a betsson
 *        bonus marker; every betsson CTA href changed to the sentinel URL;
 *        rel attributes byte-for-byte unchanged; rivalo (not in feed) untouched.
 *      (HIDE) every page that carried a mr-bet card before now has NO mr-bet
 *        card marker AND no mr-bet bonus/cta marker — gone everywhere; the
 *        surrounding HTML stays balanced (<article> open == close).
 *      (REORDER) the home Top-3 DOM order matches the toplist positions.
 * 5. Rebuilds to restore a clean dist/.
 *
 * Usage: node scripts/test-apply-offers.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createServer } from "node:http";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const DIST = join(ROOT, "dist");

const SENTINEL_BONUS = "OFERTA-CENTINELA-987-BONO";
const SENTINEL_URL = "https://example.com/offer-sentinel?track=987";
const API_KEY = "test-key-987";

const MOCK_FEED = {
  site: "ocl-onlinecasinolatino",
  updatedAt: new Date().toISOString(),
  offers: [
    {
      casinoSlug: "betsson",
      name: "Betsson",
      logoUrl: null,
      rating: 4.6,
      bonusText: SENTINEL_BONUS,
      ctaUrl: SENTINEL_URL,
      status: "active",
    },
    {
      casinoSlug: "mr-bet",
      name: "Mr Bet",
      logoUrl: null,
      rating: 4.4,
      bonusText: "no debería aplicarse",
      ctaUrl: "https://example.com/should-not-apply",
      status: "paused",
    },
    {
      casinoSlug: "casino-inexistente",
      name: "Casino Inexistente",
      logoUrl: null,
      rating: null,
      bonusText: "x",
      ctaUrl: "https://example.com/x",
      status: "active",
    },
  ],
  // Reorder the home Top-3 list. Its natural order is
  // ultra-casino > nova-jackpot > talismania; we flip it.
  toplists: [
    {
      key: "top3-home",
      name: "Top 3 del Mes",
      entries: [
        { casinoSlug: "talismania", position: 1, bonusTextOverride: null },
        { casinoSlug: "ultra-casino", position: 2, bonusTextOverride: null },
        { casinoSlug: "nova-jackpot", position: 3, bonusTextOverride: null },
      ],
    },
  ],
};
const EXPECTED_TOP3 = ["talismania", "ultra-casino", "nova-jackpot"];

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

const relsOf = (html, slug) =>
  [...html.matchAll(
    new RegExp(`<a\\b[^>]*data-offer="${slug}" data-offer-field="cta"[^>]*>`, "g")
  )].map((m) => {
    const rel = m[0].match(/\brel="([^"]*)"/);
    return rel ? rel[1] : null;
  });

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

// --- 1. fresh build (astro only — apply step is what we're testing) ---------
console.log("[test] building fresh dist (npx astro build)...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

// Snapshot: pages with betsson markers + their rel attributes + cta count.
const before = new Map(); // page -> {bonusCount, ctaCount, rels, rivaloHrefs}
for (const file of walk(DIST)) {
  const html = readFileSync(file, "utf8");
  const bonusCount = (html.match(/data-offer="betsson" data-offer-field="bonus"/g) || []).length;
  const ctaCount = (html.match(/data-offer="betsson" data-offer-field="cta"/g) || []).length;
  if (bonusCount || ctaCount) {
    before.set(file, {
      bonusCount,
      ctaCount,
      rels: relsOf(html, "betsson"),
      rivalo: [...html.matchAll(/<a\b[^>]*data-offer="rivalo" data-offer-field="cta"[^>]*>/g)].map((m) => m[0]),
    });
  }
}
check(before.size > 0, `found ${before.size} dist page(s) with betsson markers before apply`);

// Snapshot for HIDE. We separate two kinds of mr-bet surface:
//   - CARD pages: a <article>/<li> card container carrying data-offer-card.
//     These are the ones HIDE must delete (the whole card goes).
//   - the review page (/casinos/mr-bet/resena/): the casino's OWN dedicated
//     page, which has standalone CTAs but NO card container — out of scope for
//     card-hiding (deleting a CTA there would orphan the page). HIDE must leave
//     review-page CTAs in place; that is asserted separately below.
const top3Re = /<li\b[^>]*data-offer-card="([^"]+)"[^>]*>/g;
const mrBetCardPagesBefore = [];
let mrBetReviewPage = null;
let homeTop3Before = [];
for (const file of walk(DIST)) {
  const html = readFileSync(file, "utf8");
  if (/data-offer-card="mr-bet"/.test(html)) mrBetCardPagesBefore.push(file);
  else if (/data-offer="mr-bet"/.test(html)) mrBetReviewPage = file; // CTA-only page
  if (file === join(DIST, "index.html")) {
    top3Re.lastIndex = 0;
    homeTop3Before = [...html.matchAll(top3Re)].map((m) => m[1]).slice(0, 3);
  }
}
check(mrBetCardPagesBefore.length > 0, `found ${mrBetCardPagesBefore.length} dist page(s) with a mr-bet CARD before apply`);
check(
  homeTop3Before.length === 3 && JSON.stringify(homeTop3Before) !== JSON.stringify(EXPECTED_TOP3),
  `home Top-3 starts in a DIFFERENT order than the feed wants (before: ${homeTop3Before.join(" > ")})`
);

// --- 2. mock feed server -----------------------------------------------------
const server = createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    res.writeHead(401).end("unauthorized");
    return;
  }
  if (req.url.replace(/\/$/, "").endsWith("/offers")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(MOCK_FEED));
    return;
  }
  res.writeHead(404).end("not found");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log(`[test] mock feed listening on 127.0.0.1:${port}`);

// --- 3. run the apply step ---------------------------------------------------
// Runs in-process (some Windows setups firewall cross-process loopback TCP);
// the feed is still fetched over real HTTP with the Bearer auth header, so
// the full contract is exercised. The console output is captured so the
// summary/warning log lines can be asserted on.
let applyOutput = "";
const origLog = console.log;
const origWarn = console.warn;
console.log = (...a) => { applyOutput += a.join(" ") + "\n"; };
console.warn = (...a) => { applyOutput += a.join(" ") + "\n"; };
try {
  const { applyOffers } = await import("./apply-offers.mjs");
  await applyOffers({
    apiUrl: `http://127.0.0.1:${port}/v1`,
    apiKey: API_KEY,
  });
} catch (err) {
  console.log = origLog;
  console.warn = origWarn;
  check(false, `applyOffers threw: ${err.message}`);
} finally {
  console.log = origLog;
  console.warn = origWarn;
}
server.close();
console.log(applyOutput.split("\n").map((l) => "  | " + l).join("\n"));

// --- 4. assertions -----------------------------------------------------------
for (const [file, snap] of before) {
  const page = "/" + relative(DIST, file).split(sep).join("/");
  const html = readFileSync(file, "utf8");

  if (snap.bonusCount > 0) {
    const got = (html.match(new RegExp(SENTINEL_BONUS, "g")) || []).length;
    check(got === snap.bonusCount, `${page}: sentinel bonus text present ${got}/${snap.bonusCount} time(s)`);
  }
  if (snap.ctaCount > 0) {
    const ctas = [...html.matchAll(/<a\b[^>]*data-offer="betsson" data-offer-field="cta"[^>]*>/g)].map((m) => m[0]);
    const allHrefsChanged =
      ctas.length === snap.ctaCount &&
      ctas.every((a) => a.includes(`href="${SENTINEL_URL.replace(/&/g, "&amp;")}"`) || a.includes(`href="${SENTINEL_URL}"`));
    check(allHrefsChanged, `${page}: all ${snap.ctaCount} betsson CTA href(s) point at sentinel URL`);
    check(
      JSON.stringify(relsOf(html, "betsson")) === JSON.stringify(snap.rels),
      `${page}: rel attributes unchanged (${snap.rels.join(" | ")})`
    );
    check(!html.includes("record.betsson.co"), `${page}: no old betsson affiliate URL remains on tagged anchors page`);
  }
  // Non-targeted casino must be untouched.
  const rivaloNow = [...html.matchAll(/<a\b[^>]*data-offer="rivalo" data-offer-field="cta"[^>]*>/g)].map((m) => m[0]);
  if (snap.rivalo.length) {
    check(
      JSON.stringify(rivaloNow) === JSON.stringify(snap.rivalo),
      `${page}: rivalo CTAs untouched (not in feed)`
    );
  }
}

// --- HIDE: the paused casino's CARD must be GONE from every card page --------
let mrBetStillSomewhere = 0;
for (const file of mrBetCardPagesBefore) {
  const page = "/" + relative(DIST, file).split(sep).join("/");
  const html = readFileSync(file, "utf8");
  const cardLeft = (html.match(/data-offer-card="mr-bet"/g) || []).length;
  const bonusLeft = (html.match(/data-offer="mr-bet" data-offer-field="bonus"/g) || []).length;
  const ctaLeft = (html.match(/data-offer="mr-bet" data-offer-field="cta"/g) || []).length;
  const gone = cardLeft === 0 && bonusLeft === 0 && ctaLeft === 0;
  if (!gone) mrBetStillSomewhere++;
  check(gone, `[HIDE] ${page}: mr-bet card fully removed (card:${cardLeft} bonus:${bonusLeft} cta:${ctaLeft})`);
  // Page still valid: balanced <article> tags.
  const open = (html.match(/<article\b/g) || []).length;
  const close = (html.match(/<\/article>/g) || []).length;
  check(open === close, `[HIDE] ${page}: <article> tags balanced after removal (${open}/${close})`);
}
check(mrBetStillSomewhere === 0, `[HIDE] paused mr-bet card is GONE from all ${mrBetCardPagesBefore.length} card page(s)`);
check(applyOutput.includes("cards removed (paused):") && /mr-bet/.test(applyOutput), "[HIDE] apply log reports the paused-card removal");

// The casino's own review page (CTA-only, no card container) is OUT of scope
// for card-hiding — its standalone CTAs are intentionally left in place.
if (mrBetReviewPage) {
  const page = "/" + relative(DIST, mrBetReviewPage).split(sep).join("/");
  const html = readFileSync(mrBetReviewPage, "utf8");
  const ctaLeft = (html.match(/data-offer="mr-bet" data-offer-field="cta"/g) || []).length;
  check(ctaLeft > 0, `[HIDE] ${page}: review page (no card) left intact — ${ctaLeft} standalone CTA(s) untouched`);
}

// --- REORDER: home Top-3 DOM order now matches the toplist -------------------
{
  const html = readFileSync(join(DIST, "index.html"), "utf8");
  const order = [...html.matchAll(/<li\b[^>]*data-offer-card="([^"]+)"[^>]*>/g)].map((m) => m[1]).slice(0, 3);
  check(
    JSON.stringify(order) === JSON.stringify(EXPECTED_TOP3),
    `[REORDER] home Top-3 DOM order is ${order.join(" > ")} (expected ${EXPECTED_TOP3.join(" > ")})`
  );
  // The reordered cards keep their full content (rank badge + bonus + cta).
  const tali = html.match(/<li[^>]*data-offer-card="talismania"[\s\S]*?<\/li>/);
  check(
    !!tali && /rank-badge/.test(tali[0]) && /top3-bonus/.test(tali[0]) && /top3-cta/.test(tali[0]),
    "[REORDER] reordered talismania card still has rank-badge + bonus + cta intact"
  );
  check(/lists reordered:\s*[1-9]/.test(applyOutput), "[REORDER] apply log reports a list was reordered");
}

check(applyOutput.includes("casino-inexistente"), "apply log warns about feed slug matching nothing");

// --- 5. restore --------------------------------------------------------------
console.log("[test] rebuilding to restore clean dist...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

console.log(failures === 0 ? "\n[test] ALL CHECKS PASSED" : `\n[test] ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
