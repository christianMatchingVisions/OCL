/**
 * End-to-end test for scripts/apply-offers.mjs.
 *
 * 1. Builds the site fresh (astro build only, no apply step).
 * 2. Serves a mock offers feed on localhost (Betsson gets a sentinel bonus
 *    text + sentinel CTA URL; mr-bet is "paused" to exercise the warning).
 * 3. Runs the apply step against the mock feed.
 * 4. Asserts:
 *      - the sentinel bonus text appears on EVERY page that had a betsson
 *        bonus marker before the run;
 *      - every betsson CTA href changed to the sentinel URL;
 *      - rel attributes of those anchors are byte-for-byte unchanged;
 *      - non-betsson markers (e.g. rivalo) are untouched.
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
  toplists: [],
};

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

check(/paused/i.test(applyOutput) && applyOutput.includes("mr-bet"), "apply log warns about paused mr-bet pages");
check(applyOutput.includes("casino-inexistente"), "apply log warns about feed slug matching nothing");

// --- 5. restore --------------------------------------------------------------
console.log("[test] rebuilding to restore clean dist...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

console.log(failures === 0 ? "\n[test] ALL CHECKS PASSED" : `\n[test] ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
