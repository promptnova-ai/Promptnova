import fs from "fs";
import path from "path";

const SITE_BASE = "https://promptnova.me";
const root = process.cwd();
const postsDir = path.join(root, "posts");
const today = new Date().toISOString().slice(0, 10);
const staticUrls = [
  ["/", "1.0"],
  ["/privacidad.html", "0.3"],
  ["/terminos.html", "0.3"],
  ["/aviso-legal.html", "0.3"],
  ["/editorial.html", "0.5"],
];
const postFiles = fs
  .readdirSync(postsDir)
  .filter((file) => file.endsWith(".html"))
  .sort()
  .reverse();
const indexPath = path.join(postsDir, "index.json");
const indexSlugs = fs.existsSync(indexPath)
  ? new Set(JSON.parse(fs.readFileSync(indexPath, "utf8")).map((post) => post.slug))
  : new Set(postFiles);
const indexableSlugs = new Set(
  postFiles.filter((file) => !/<meta\s+name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(path.join(postsDir, file), "utf8")))
);

const urls = [
  ...staticUrls.map(([url, priority]) => ({
    loc: `${SITE_BASE}${url}`,
    lastmod: today,
    priority,
  })),
  ...postFiles.filter((file) => indexSlugs.has(file) && indexableSlugs.has(file)).map((file) => ({
    loc: `${SITE_BASE}/posts/${file}`,
    lastmod: file.slice(0, 10),
    priority: "0.6",
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
  .map(
    ({ loc, lastmod, priority }) =>
      `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`
  )
  .join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(root, "sitemap.xml"), xml, "utf8");
console.log(`sitemap.xml actualizado: ${urls.length} URLs`);
