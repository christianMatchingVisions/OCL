/**
 * VERIFICATION-ONLY pick-and-choose proof for the control panel.
 *
 * Does NOT touch the real Content Engine DB, real feed, or real webhooks.
 * Everything runs against a localhost MOCK feed that simulates exactly what
 * the dashboard's GET /v1/offers would return for online-casino-latino.
 *
 * Picked brand: LEOVEGAS (appears on 6 dist surfaces; has a real affiliate
 * href in the static fallback we can watch change / stay).
 *
 * Phase A ("choose: active"):  LeoVegas active w/ sentinel bonus + sentinel
 *   CTA -> assert dist surfaces ALTERED (sentinel bonus injected on every
 *   bonus marker; every LeoVegas CTA href rewritten to the sentinel URL; the
 *   real affiliate href is gone; rel attrs byte-for-byte unchanged).
 *
 * Phase B ("choose: paused"):  fresh build, LeoVegas paused -> assert the
 *   apply step HIDES the brand: every LeoVegas CARD (article.casino-card /
 *   li.top3-item carrying data-offer-card) is REMOVED from every page it was
 *   on; the sentinel is never injected; surrounding HTML stays balanced; the
 *   apply log reports the removal. (LeoVegas's own /resena/ review page has no
 *   card container, so its standalone CTAs are out of scope and left intact.)
 *   This is the current contract: pause = the card disappears.
 *
 * A control brand (rivalo) is asserted untouched in both phases.
 *
 * Restores a clean dist/ at the end (npx astro build).
 */

import { readFileSync, readdirSync, statSync, copyFileSync, mkdirSync, rmSync } from "node:fs";
import { join, relative, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createServer } from "node:http";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const DIST = join(ROOT, "dist");
const BACKUP = join(ROOT, ".dist-verify-backup");

const PICK = "leovegas";
const CONTROL = "rivalo";
const SENTINEL_BONUS = "PICKCHOOSE-CENTINELA-555-BONO";
const SENTINEL_URL = "https://example.com/pickchoose-555?track=ocl";
const API_KEY = "verify-key-555";

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith(".html")) out.push(p);
  }
  return out;
}

function snapshotPick() {
  const snap = new Map(); // file -> {bonusCount, ctaCount, ctaAnchors, controlAnchors}
  for (const file of walk(DIST)) {
    const html = readFileSync(file, "utf8");
    const bonusCount = (html.match(new RegExp(`data-offer="${PICK}" data-offer-field="bonus"`, "g")) || []).length;
    const ctaCount = (html.match(new RegExp(`data-offer="${PICK}" data-offer-field="cta"`, "g")) || []).length;
    const cardCount = (html.match(new RegExp(`data-offer-card="${PICK}"`, "g")) || []).length;
    if (bonusCount || ctaCount) {
      snap.set(file, {
        bonusCount,
        ctaCount,
        cardCount, // # of PICK card containers on this page (0 on the review page)
        ctaAnchors: [...html.matchAll(new RegExp(`<a\\b[^>]*data-offer="${PICK}" data-offer-field="cta"[^>]*>`, "g"))].map((m) => m[0]),
        controlAnchors: [...html.matchAll(new RegExp(`<a\\b[^>]*data-offer="${CONTROL}" data-offer-field="cta"[^>]*>`, "g"))].map((m) => m[0]),
      });
    }
  }
  return snap;
}

const relsOf = (anchor) => {
  const m = anchor.match(/\brel="([^"]*)"/);
  return m ? m[1] : null;
};

let failures = 0;
const log = [];
const check = (ok, msg) => {
  log.push(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

function mockFeed(pickStatus) {
  return {
    site: "ocl-onlinecasinolatino",
    updatedAt: new Date().toISOString(),
    offers: [
      {
        casinoSlug: PICK,
        name: "LeoVegas",
        logoUrl: null,
        rating: 4.7,
        bonusText: SENTINEL_BONUS,
        ctaUrl: SENTINEL_URL,
        status: pickStatus, // "active" or "paused" — the panel's choice
      },
    ],
    toplists: [],
  };
}

async function runApplyWithFeed(feed) {
  const server = createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${API_KEY}`) {
      res.writeHead(401).end("unauthorized");
      return;
    }
    if (req.url.replace(/\/$/, "").endsWith("/offers")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(feed));
      return;
    }
    res.writeHead(404).end("not found");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  let out = "";
  const oLog = console.log, oWarn = console.warn;
  console.log = (...a) => { out += a.join(" ") + "\n"; };
  console.warn = (...a) => { out += a.join(" ") + "\n"; };
  try {
    const { applyOffers } = await import("./apply-offers.mjs");
    await applyOffers({ apiUrl: `http://127.0.0.1:${port}/v1`, apiKey: API_KEY });
  } finally {
    console.log = oLog; console.warn = oWarn;
    server.close();
  }
  return out;
}

function backupDist() {
  rmSync(BACKUP, { recursive: true, force: true });
  for (const file of walk(DIST)) {
    const rel = relative(DIST, file);
    const dest = join(BACKUP, rel);
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
  }
}
function restoreDist() {
  for (const file of walk(BACKUP)) {
    const rel = relative(BACKUP, file);
    copyFileSync(file, join(DIST, rel));
  }
}

// ===========================================================================
console.log("[verify] fresh build (npx astro build)...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

const before = snapshotPick();
check(before.size > 0, `picked brand ${PICK} present on ${before.size} dist surface(s) before apply`);
const totalBonus = [...before.values()].reduce((a, s) => a + s.bonusCount, 0);
const totalCta = [...before.values()].reduce((a, s) => a + s.ctaCount, 0);
log.push(`[info] ${PICK} markers before: ${totalBonus} bonus, ${totalCta} cta across ${before.size} pages`);

// back up the clean fresh dist so we can restore between phases
backupDist();

// ---------- PHASE A: choose ACTIVE -> dist must be ALTERED -----------------
log.push(`\n=== PHASE A: panel sets ${PICK} = ACTIVE (sentinel bonus + sentinel CTA) ===`);
const outA = await runApplyWithFeed(mockFeed("active"));
let alteredBonusPages = 0, alteredCtaPages = 0, affiliateGoneEverywhere = true, relsStableA = true, controlStableA = true;
for (const [file, snap] of before) {
  const html = readFileSync(file, "utf8");
  if (snap.bonusCount > 0) {
    const got = (html.match(new RegExp(SENTINEL_BONUS, "g")) || []).length;
    if (got === snap.bonusCount) alteredBonusPages++;
    check(got === snap.bonusCount, `[A] ${"/" + relative(DIST, file).split(sep).join("/")}: sentinel bonus injected ${got}/${snap.bonusCount}`);
  }
  if (snap.ctaCount > 0) {
    const ctas = [...html.matchAll(new RegExp(`<a\\b[^>]*data-offer="${PICK}" data-offer-field="cta"[^>]*>`, "g"))].map((m) => m[0]);
    const allChanged = ctas.length === snap.ctaCount && ctas.every((a) =>
      a.includes(`href="${SENTINEL_URL}"`) || a.includes(`href="${SENTINEL_URL.replace(/&/g, "&amp;")}"`));
    if (allChanged) alteredCtaPages++;
    check(allChanged, `[A] CTA href rewritten to sentinel on all ${snap.ctaCount} ${PICK} anchors`);
    if (/leovegas\.com/i.test(ctas.join(""))) affiliateGoneEverywhere = false;
    // rel byte-stable
    const relsBefore = snap.ctaAnchors.map(relsOf);
    const relsAfter = ctas.map(relsOf);
    if (JSON.stringify(relsBefore) !== JSON.stringify(relsAfter)) relsStableA = false;
    check(JSON.stringify(relsBefore) === JSON.stringify(relsAfter), `[A] rel attrs byte-stable on ${PICK} anchors`);
  }
  // control untouched
  const controlNow = [...html.matchAll(new RegExp(`<a\\b[^>]*data-offer="${CONTROL}" data-offer-field="cta"[^>]*>`, "g"))].map((m) => m[0]);
  if (snap.controlAnchors.length && JSON.stringify(controlNow) !== JSON.stringify(snap.controlAnchors)) controlStableA = false;
}
check(affiliateGoneEverywhere, `[A] real leovegas affiliate href no longer present on any tagged ${PICK} anchor`);
check(controlStableA, `[A] control brand ${CONTROL} anchors untouched (not in feed)`);

// restore the clean dist for phase B
restoreDist();

// ---------- PHASE B: choose PAUSED -> card HIDDEN everywhere ---------------
log.push(`\n=== PHASE B: panel sets ${PICK} = PAUSED -> every ${PICK} CARD is removed ===`);
const outB = await runApplyWithFeed(mockFeed("paused"));
let sentinelLeaked = false, cardStillSomewhere = 0, balancedEverywhere = true, reviewIntact = true;
const cardPages = [...before].filter(([, s]) => s.cardCount > 0);
for (const [file, snap] of before) {
  const html = readFileSync(file, "utf8");
  if ((html.match(new RegExp(SENTINEL_BONUS, "g")) || []).length > 0) sentinelLeaked = true;
  if (html.includes(`href="${SENTINEL_URL}"`)) sentinelLeaked = true;
  if (snap.cardCount > 0) {
    // Card page: the whole card (and its bonus/cta markers) must be gone.
    const cardLeft = (html.match(new RegExp(`data-offer-card="${PICK}"`, "g")) || []).length;
    const ctaLeft = (html.match(new RegExp(`data-offer="${PICK}" data-offer-field="cta"`, "g")) || []).length;
    if (cardLeft !== 0 || ctaLeft !== 0) cardStillSomewhere++;
    const open = (html.match(/<article\b/g) || []).length;
    const close = (html.match(/<\/article>/g) || []).length;
    if (open !== close) balancedEverywhere = false;
  } else {
    // Review page (no card container): standalone CTAs left intact.
    if ((html.match(new RegExp(`data-offer="${PICK}" data-offer-field="cta"`, "g")) || []).length === 0) reviewIntact = false;
  }
}
check(!sentinelLeaked, `[B] paused brand: sentinel bonus/CTA NOT injected anywhere (pause respected)`);
check(cardStillSomewhere === 0, `[B] paused brand: ${PICK} CARD removed from all ${cardPages.length} card page(s)`);
check(balancedEverywhere, `[B] paused brand: <article> tags stay balanced after card removal (valid HTML)`);
check(reviewIntact, `[B] paused brand: the ${PICK} review page (no card) is left intact`);
check(/cards removed \(paused\):/i.test(outB) && outB.includes(PICK), `[B] apply log reports the ${PICK} card removal`);
const listedSurfaces = (outB.match(new RegExp("- /[^\\n]+", "g")) || []).filter(Boolean);
log.push(`[info] PHASE B apply listed ${listedSurfaces.length} surface line(s) under the HIDE summary`);

// ---------- restore clean dist ---------------------------------------------
log.push("\n[verify] restoring clean dist (npx astro build)...");
restoreDist();
rmSync(BACKUP, { recursive: true, force: true });
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

console.log("\n----- PHASE A apply log (excerpt) -----");
console.log(outA.split("\n").filter((l) => /leovegas|Summary|files touched/i.test(l)).join("\n"));
console.log("\n----- PHASE B apply log (excerpt) -----");
console.log(outB.split("\n").filter((l) => /paused|leovegas|WARNING|Summary/i.test(l)).slice(0, 20).join("\n"));

console.log("\n----- CHECKS -----");
console.log(log.join("\n"));
console.log(`\n[verify] ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"}`);
process.exit(failures === 0 ? 0 : 1);
