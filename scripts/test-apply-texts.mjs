/**
 * End-to-end test for scripts/apply-texts.mjs (pattern-copied from
 * test-apply-offers.mjs, including its in-process fetch workaround).
 *
 * 1. Builds the site fresh (astro build only, no apply steps).
 * 2. Runs the apply step with no credentials -> must log "not configured".
 * 3. Serves a mock text-blocks feed on localhost:
 *      - argentina-hero-sub (marker) gets a sentinel text (with HTML-unsafe
 *        characters to exercise escaping);
 *      - argentina-intro (marker) is a no-op (currentText === originalText);
 *      - clave-inexistente (marker) matches nothing -> warning;
 *      - one "replace" block swaps a real sentence read from
 *        dist/sobre-nosotros/index.html for a sentinel;
 *      - one "replace" block with text that exists nowhere -> warn + skip.
 * 4. Runs the apply step and asserts every rule above.
 * 5. Rebuilds to restore a clean dist/.
 *
 * Usage: node scripts/test-apply-texts.mjs
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { createServer } from "node:http";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const DIST = join(ROOT, "dist");

const SENTINEL_HERO = 'TEXTO-CENTINELA-654 <b>&"raro"</b>';
const SENTINEL_HERO_ESCAPED = "TEXTO-CENTINELA-654 &lt;b&gt;&amp;&quot;raro&quot;&lt;/b&gt;"
  .replace(/&quot;/g, '"'); // escapeHtml escapes & < > but not quotes in text
const SENTINEL_REPLACE = "FRASE-CENTINELA-321 reemplazada con éxito.";
const API_KEY = "test-key-654";

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${msg}`);
  if (!ok) failures++;
};

// --- 1. fresh build (astro only — apply step is what we're testing) ---------
console.log("[test] building fresh dist (npx astro build)...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

const argentinaFile = join(DIST, "argentina", "index.html");
const sobreFile = join(DIST, "sobre-nosotros", "index.html");

// Snapshot the tagged elements before the run.
const innerOf = (html, key) => {
  const m = html.match(new RegExp(`<([a-z0-9-]+)\\b[^>]*data-mv-text="${key}"[^>]*>`));
  if (!m) return null;
  const start = m.index + m[0].length;
  return html.slice(start, html.indexOf(`</${m[1]}>`, start));
};
const argentinaBefore = readFileSync(argentinaFile, "utf8");
const introBefore = innerOf(argentinaBefore, "argentina-intro");
check(innerOf(argentinaBefore, "argentina-hero-sub") !== null, "dist/argentina has the argentina-hero-sub marker");
check(introBefore !== null, "dist/argentina has the argentina-intro marker");

// Real sentence for the "replace" block, read from the built page (the first
// intro paragraph of /sobre-nosotros/), whitespace-normalized like the
// dashboard seed stores it.
const sobreBefore = readFileSync(sobreFile, "utf8");
const sobreIntroRaw = innerOf(sobreBefore, "sobre-nosotros-intro");
check(!!sobreIntroRaw, "dist/sobre-nosotros has the sobre-nosotros-intro marker");
const REAL_SENTENCE = sobreIntroRaw.replace(/\s+/g, " ").trim();

const MOCK_FEED = {
  site: "ocl-onlinecasinolatino",
  updatedAt: new Date().toISOString(),
  blocks: [
    {
      blockKey: "argentina-hero-sub",
      kind: "marker",
      pagePath: "/argentina/",
      label: "Argentina — hero subtitle",
      originalText: "texto original irrelevante para markers",
      currentText: SENTINEL_HERO,
    },
    {
      blockKey: "argentina-intro",
      kind: "marker",
      pagePath: "/argentina/",
      label: "Argentina — intro paragraph",
      originalText: "sin cambios",
      currentText: "sin cambios", // no-op -> must be skipped
    },
    {
      blockKey: "clave-inexistente",
      kind: "marker",
      pagePath: "/argentina/",
      label: "Ghost block",
      originalText: "a",
      currentText: "b", // matches nothing -> warning
    },
    {
      blockKey: "sobre-nosotros-replace-1",
      kind: "replace",
      pagePath: "/sobre-nosotros/",
      label: "About — mission first sentence",
      originalText: REAL_SENTENCE,
      currentText: SENTINEL_REPLACE,
    },
    {
      blockKey: "sobre-nosotros-replace-missing",
      kind: "replace",
      pagePath: "/sobre-nosotros/",
      label: "About — text that does not exist",
      originalText: "Esta frase no existe en ninguna parte del sitio 9999.",
      currentText: "no debería aplicarse",
    },
  ],
};

// --- 2. skip path: no credentials --------------------------------------------
const { applyTexts } = await import("./apply-texts.mjs");
{
  let out = "";
  const orig = console.log;
  console.log = (...a) => { out += a.join(" ") + "\n"; };
  await applyTexts({ apiUrl: "", apiKey: "" });
  console.log = orig;
  check(/not configured, skipping/.test(out), "no-env run logs 'not configured' and changes nothing");
}

// --- 3. mock feed server -------------------------------------------------------
const server = createServer((req, res) => {
  if (req.headers.authorization !== `Bearer ${API_KEY}`) {
    res.writeHead(401).end("unauthorized");
    return;
  }
  if (req.url.replace(/\/$/, "").endsWith("/text-blocks")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(MOCK_FEED));
    return;
  }
  res.writeHead(404).end("not found");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
console.log(`[test] mock feed listening on 127.0.0.1:${port}`);

// --- 4. run the apply step -----------------------------------------------------
// Runs in-process (some Windows setups firewall cross-process loopback TCP);
// the feed is still fetched over real HTTP with the Bearer auth header, so
// the full contract is exercised.
let applyOutput = "";
const origLog = console.log;
const origWarn = console.warn;
console.log = (...a) => { applyOutput += a.join(" ") + "\n"; };
console.warn = (...a) => { applyOutput += a.join(" ") + "\n"; };
try {
  await applyTexts({ apiUrl: `http://127.0.0.1:${port}/v1`, apiKey: API_KEY });
} catch (err) {
  console.log = origLog;
  console.warn = origWarn;
  check(false, `applyTexts threw: ${err.message}`);
} finally {
  console.log = origLog;
  console.warn = origWarn;
}
server.close();
console.log(applyOutput.split("\n").map((l) => "  | " + l).join("\n"));

// --- 5. assertions ---------------------------------------------------------------
const argentinaAfter = readFileSync(argentinaFile, "utf8");
const sobreAfter = readFileSync(sobreFile, "utf8");

check(
  innerOf(argentinaAfter, "argentina-hero-sub") === SENTINEL_HERO_ESCAPED,
  "marker: argentina-hero-sub inner text replaced with HTML-escaped sentinel"
);
check(
  !argentinaAfter.includes('<b>&"raro"</b>'),
  "marker: raw (unescaped) sentinel HTML never lands in the page"
);
check(
  innerOf(argentinaAfter, "argentina-intro") === introBefore,
  "no-op: argentina-intro (currentText === originalText) left byte-identical"
);
check(
  sobreAfter.includes(SENTINEL_REPLACE),
  "replace: sentinel sentence present in dist/sobre-nosotros"
);
check(
  innerOf(sobreAfter, "sobre-nosotros-intro").replace(/\s+/g, " ").trim() === SENTINEL_REPLACE,
  "replace: the matched sentence (and only it) was swapped"
);
check(
  !sobreAfter.includes("no debería aplicarse"),
  "replace: not-found originalText was never applied"
);
check(/clave-inexistente/.test(applyOutput), "apply log warns about marker key matching nothing");
check(
  /sobre-nosotros-replace-missing.*found 0 time/.test(applyOutput),
  "apply log warns about replace block found 0 times (skipped, never guessing)"
);

// --- 6. restore -------------------------------------------------------------------
console.log("[test] rebuilding to restore clean dist...");
execSync("npx astro build", { cwd: ROOT, stdio: "pipe" });

console.log(failures === 0 ? "\n[test] ALL CHECKS PASSED" : `\n[test] ${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
