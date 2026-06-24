/**
 * add-sitemap-lastmod.mjs — post-build "stamp <lastmod> into the sitemap" step.
 *
 * @astrojs/sitemap emits the URL set but NO <lastmod>. lastmod is the highest-
 * leverage freshness/recrawl signal for Googlebot and AI crawlers, and the SEO
 * auto-indexer uses it to detect which URLs changed and need (re)submitting.
 *
 * For every <loc> in the generated sitemap we open the built dist HTML and read
 * the FIRST modified date the page already publishes (JSON-LD dateModified, then
 * article:modified_time / og:updated_time, then datePublished). Whatever the page
 * already states is what we stamp, so lastmod never contradicts the page and we
 * never fabricate freshness. Pages with no machine-readable date get no lastmod.
 *
 * Strict no-op: missing/unreadable sitemap → warn and exit 0 (never fail build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(repoRoot, "dist");

function log(msg) {
  console.log(`[lastmod] ${msg}`);
}
function warn(msg) {
  console.warn(`[lastmod] WARN: ${msg}`);
}

/** Map a sitemap <loc> URL to its built dist HTML file (trailingSlash sites). */
function distFileForLoc(loc) {
  let pathname;
  try {
    pathname = new URL(loc).pathname;
  } catch {
    return null;
  }
  const rel = pathname.replace(/^\//, "").replace(/\/$/, "");
  return rel ? path.join(distDir, rel, "index.html") : path.join(distDir, "index.html");
}

/** Pull the first modified date a page publishes, as YYYY-MM-DD, or null. */
function modifiedDateFromHtml(html) {
  const candidates = [
    /"dateModified"\s*:\s*"([^"]+)"/i,
    /<meta[^>]*\bproperty=["']article:modified_time["'][^>]*\bcontent=["']([^"']+)["']/i,
    /<meta[^>]*\bproperty=["']og:updated_time["'][^>]*\bcontent=["']([^"']+)["']/i,
    /"datePublished"\s*:\s*"([^"]+)"/i,
  ];
  for (const re of candidates) {
    const m = re.exec(html);
    if (m) {
      const d = new Date(m[1]);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
  }
  return null;
}

function processSitemapFile(file) {
  let xml = fs.readFileSync(file, "utf8");
  let stamped = 0;
  let already = 0;
  let nodate = 0;

  xml = xml.replace(/<url>([\s\S]*?)<\/url>/g, (full, inner) => {
    if (/<lastmod>/i.test(inner)) {
      already++;
      return full;
    }
    const locMatch = /<loc>([^<]+)<\/loc>/i.exec(inner);
    if (!locMatch) return full;
    const distFile = distFileForLoc(locMatch[1].trim());
    if (!distFile || !fs.existsSync(distFile)) {
      nodate++;
      return full;
    }
    const date = modifiedDateFromHtml(fs.readFileSync(distFile, "utf8"));
    if (!date) {
      nodate++;
      return full;
    }
    stamped++;
    return `<url>${inner.replace(/(<loc>[^<]+<\/loc>)/i, `$1<lastmod>${date}</lastmod>`)}</url>`;
  });

  fs.writeFileSync(file, xml);
  log(`${path.basename(file)}: stamped ${stamped}, already had ${already}, no date ${nodate}`);
}

function main() {
  if (!fs.existsSync(distDir)) {
    warn(`dist/ not found at ${distDir} — skipping (no-op).`);
    return;
  }
  const files = fs
    .readdirSync(distDir)
    .filter((f) => /^sitemap-\d+\.xml$/i.test(f))
    .map((f) => path.join(distDir, f));
  if (files.length === 0) {
    warn("no sitemap-N.xml files in dist/ — skipping (no-op).");
    return;
  }
  for (const file of files) processSitemapFile(file);
}

try {
  main();
} catch (err) {
  warn(`unexpected error (continuing): ${err?.message ?? err}`);
}
