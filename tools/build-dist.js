// Builds dist/: the exact files to upload to the client's cPanel host.
// That host refuses to serve /js/main.js (403), so the JS is inlined into each
// page here; everything else is copied as-is, keeping the site's folder layout.
// Run: node tools/build-dist.js
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const pages = ["index.html"]; // rebuilt pages only; inner pages join as they are redone
const copies = ["css/style.css", "favicon.svg", "robots.txt", "sitemap.xml", ".htaccess"];

const write = (rel, data) => {
  const p = path.join(dist, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, data);
};
const copy = (rel) => write(rel, fs.readFileSync(path.join(root, rel)));

fs.rmSync(dist, { recursive: true, force: true });

const js = fs.readFileSync(path.join(root, "js/main.js"), "utf8");
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), "utf8");
  const tag = /<script src="js\/main\.js"( defer)?><\/script>/;
  if (!tag.test(html)) throw new Error(`${page}: main.js script tag not found`);
  write(page, html.replace(tag, () => `<script>\n${js}\n</script>`));
}
copies.forEach(copy);
const videoDir = path.join(root, "assets/video");
if (fs.existsSync(videoDir)) fs.readdirSync(videoDir).forEach((f) => copy(`assets/video/${f}`));

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
for (const f of walk(dist)) {
  console.log(`${(fs.statSync(f).size / 1024).toFixed(0).padStart(7)} KB  ${path.relative(dist, f).replace(/\\/g, "/")}`);
}
