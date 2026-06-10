/**
 * One-shot converter: turns the original static OCL-test site into Astro pages.
 *
 *   node scripts/convert-from-static.mjs [path-to-static-site]
 *
 * For every *.html page it writes:
 *   src/fragments/<page>/head.html  - original <head> content (minus shell tags)
 *   src/fragments/<page>/body.html  - original <body> content (minus script.js)
 *   src/pages/<page>/index.astro    - thin page wiring both into the Shell layout
 *
 * Pages that already have a hand-written .astro file with a "@custom" marker
 * are skipped, so customized pages (e.g. /noticias/) survive re-runs.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = process.argv[2] ?? join(process.env.TEMP ?? "/tmp", "OCL-test");
const SKIP = new Set(["website.html", "website.php"]);

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!["logos", "scripts", ".git"].includes(name)) walk(p);
    } else if (name.endsWith(".html") && !SKIP.has(name)) {
      htmlFiles.push(p);
    }
  }
})(src);

let converted = 0, skipped = 0;
for (const file of htmlFiles) {
  const rel = relative(src, file).split(sep).join("/"); // e.g. argentina/index.html
  const pageDir = rel === "index.html" ? "" : rel.replace(/\/index\.html$/, "").replace(/\.html$/, "");
  const fragDir = join(root, "src", "fragments", pageDir || "home");
  const pageFile = join(root, "src", "pages", pageDir, "index.astro");

  if (existsSync(pageFile) && readFileSync(pageFile, "utf8").includes("@custom")) {
    console.log(`skip (custom): ${pageDir || "/"}`);
    skipped++;
    continue;
  }

  const html = readFileSync(file, "utf8");
  const headMatch = html.match(/<head>([\s\S]*?)<\/head>/i);
  const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/i);
  if (!headMatch || !bodyMatch) throw new Error(`No head/body in ${rel}`);

  // The Shell layout owns charset, viewport, favicon, stylesheet and script.js.
  const head = headMatch[1]
    .replace(/<meta charset[^>]*>/gi, "")
    .replace(/<meta name="viewport"[^>]*>/gi, "")
    .replace(/<link rel="icon"[^>]*>/gi, "")
    .replace(/<link rel="stylesheet"[^>]*>/gi, "")
    .replace(/^\s*[\r\n]/gm, "")
    .trim();
  const body = bodyMatch[1]
    .replace(/<script src="\/script\.js"><\/script>/gi, "")
    .trim();

  mkdirSync(fragDir, { recursive: true });
  writeFileSync(join(fragDir, "head.html"), head + "\n");
  writeFileSync(join(fragDir, "body.html"), body + "\n");

  const depth = pageDir ? pageDir.split("/").length : 0;
  const up = "../".repeat(depth + 1); // pages/<pageDir>/index.astro -> src/
  const fragPath = `${up}fragments/${pageDir || "home"}`;
  mkdirSync(dirname(pageFile), { recursive: true });
  writeFileSync(
    pageFile,
    `---
import Shell from "${up}layouts/Shell.astro";
import head from "${fragPath}/head.html?raw";
import body from "${fragPath}/body.html?raw";
---

<Shell head={head} body={body} />
`
  );
  converted++;
  console.log(`converted: ${pageDir || "/"}`);
}
console.log(`\n${converted} pages converted, ${skipped} custom pages preserved.`);
