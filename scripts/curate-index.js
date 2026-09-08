import fs from "fs";
import path from "path";

const root = process.cwd();
const postsDir = path.join(root, "posts");
const pillarSlug = "2026-09-08-como-evaluar-prompts-y-verificar-respuestas.html";
const pillarPath = path.join(postsDir, pillarSlug);

function extractPrompts(html) {
  return [...html.matchAll(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, "").trim())
    .filter(Boolean);
}

function wordCount(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/&[^;]+;/g, " ").split(/\s+/).filter(Boolean).length;
}

if (!fs.existsSync(pillarPath)) throw new Error(`No existe el artículo pilar: ${pillarSlug}`);

for (const filename of fs.readdirSync(postsDir).filter((file) => file.endsWith(".html") && file !== pillarSlug)) {
  const filePath = path.join(postsDir, filename);
  let html = fs.readFileSync(filePath, "utf8");
  if (!/<meta\s+name=["']robots["']/i.test(html)) {
    html = html.replace(/(\s*<meta name="viewport"[^>]*>)/i, '$1\n  <meta name="robots" content="noindex, follow">');
  } else {
    html = html.replace(/<meta\s+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex, follow">');
  }
  fs.writeFileSync(filePath, html, "utf8");
}

const pillarHtml = fs.readFileSync(pillarPath, "utf8");
const title = pillarHtml.match(/<title>([^|<]+)/i)?.[1].trim() || "Cómo evaluar un prompt y verificar la respuesta de una IA";
const description = pillarHtml.match(/<meta name="description" content="([^"]+)/i)?.[1] || "Método práctico para diseñar, probar y evaluar prompts con criterios claros, ejemplos comparables y verificación de respuestas.";
const indexEntry = {
  slug: pillarSlug,
  title,
  description,
  date: "2026-09-08",
  tags: ["prompt engineering", "evaluación", "verificación"],
  readingTime: 9,
  category: "general",
  prompts: extractPrompts(pillarHtml),
  topic: "Cómo evaluar prompts y verificar respuestas de IA",
  wordCount: wordCount(pillarHtml),
};
fs.writeFileSync(path.join(postsDir, "index.json"), `${JSON.stringify([indexEntry], null, 2)}\n`, "utf8");

const indexPath = path.join(root, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
const slim = JSON.stringify([indexEntry].map(({ slug, title: entryTitle, description: entryDescription, date, tags, readingTime, category }) => ({
  slug,
  title: entryTitle,
  description: entryDescription,
  date,
  tags,
  readingTime,
  category,
})));
indexHtml = indexHtml.replace(/(\/\/ BLOG_POSTS_START\s*\n\s*const BLOG_POSTS = )([\s\S]*?)(;\s*\n\s*\/\/ BLOG_POSTS_END)/, `$1${slim}$3`);
const staticCard = `
      <a href="./posts/${pillarSlug}" class="blog-card" style="text-decoration:none;">
        <div class="blog-thumb" style="background:linear-gradient(135deg,rgba(45,212,191,0.2),rgba(74,222,128,0.1))">🔎</div>
        <div class="blog-body">
          <div class="blog-meta"><span class="blog-cat-badge">🌐 Método</span><span class="blog-date">2026-09-08</span></div>
          <h3>${title}</h3>
          <p>${description}</p>
          <span class="blog-read">Leer artículo →</span>
        </div>
      </a>
    `;
indexHtml = indexHtml.replace(/(<!-- BLOG_GRID_STATIC_START -->)[\s\S]*?(<!-- BLOG_GRID_STATIC_END -->)/, `$1${staticCard}$2`);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log(`Índice editorial reducido al artículo pilar; ${fs.readdirSync(postsDir).filter((file) => file.endsWith(".html")).length - 1} entradas antiguas conservan su URL con noindex.`);