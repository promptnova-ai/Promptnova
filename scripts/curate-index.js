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

function getMeta(html, name) {
  const match = html.match(new RegExp(`<meta\\s+name=["']${name}["']\\s+content=["']([^"']*)`, "i"));
  return match?.[1]?.trim() || "";
}

function getTitle(html, fallback) {
  return html.match(/<title>([^<|]+)/i)?.[1].trim() || fallback;
}

function getDate(filename, html) {
  return html.match(/<time[^>]+datetime=["'](\\d{4}-\\d{2}-\\d{2})/i)?.[1] || filename.slice(0, 10);
}

function getTags(html) {
  const tagText = [...html.matchAll(/<span class="tag">([^<]+)<\/span>/gi)].map((match) => match[1].trim());
  return tagText.length ? tagText : ["IA"];
}

function inferCategory(title, tags) {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();
  const rules = [
    ["programacion", "código api software developer programación"],
    ["marketing", "marketing viral redes sociales seo contenido"],
    ["emprendimiento", "negocio empresa ventas automatiza"],
    ["estudio", "aprender curso estudio educación"],
    ["trabajo", "trabajo email profesional productividad"],
    ["personal", "personal creatividad hábitos bienestar"],
  ];
  return rules.find(([, words]) => words.split(" ").some((word) => text.includes(word)))?.[0] || "general";
}

if (!fs.existsSync(pillarPath)) throw new Error(`No existe el artículo pilar: ${pillarSlug}`);

const existingIndexPath = path.join(postsDir, "index.json");
const existingIndex = fs.existsSync(existingIndexPath)
  ? JSON.parse(fs.readFileSync(existingIndexPath, "utf8"))
  : [];
const metadataBySlug = new Map(existingIndex.map((post) => [post.slug, post]));
const postFiles = fs.readdirSync(postsDir)
  .filter((file) => file.endsWith(".html"))
  .sort()
  .reverse();

const catalog = postFiles.map((filename) => {
  const html = fs.readFileSync(path.join(postsDir, filename), "utf8");
  const previous = metadataBySlug.get(filename) || {};
  const title = previous.title || getTitle(html, filename.replace(/\.html$/, ""));
  const description = previous.description || getMeta(html, "description") || "Guía práctica de PromptNova sobre inteligencia artificial.";
  const tags = previous.tags?.length ? previous.tags : getTags(html);
  return {
    slug: filename,
    title,
    description,
    date: previous.date || getDate(filename, html),
    tags,
    readingTime: previous.readingTime || Math.max(1, Math.ceil(wordCount(html) / 200)),
    category: previous.category || inferCategory(title, tags),
    prompts: previous.prompts?.length ? previous.prompts : extractPrompts(html),
    topic: previous.topic || title,
    wordCount: wordCount(html),
  };
});

for (const filename of postFiles.filter((file) => file !== pillarSlug)) {
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
const pillarIndex = catalog.find((post) => post.slug === pillarSlug);
if (pillarIndex) {
  Object.assign(pillarIndex, indexEntry);
}
fs.writeFileSync(path.join(postsDir, "index.json"), `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

const indexPath = path.join(root, "index.html");
let indexHtml = fs.readFileSync(indexPath, "utf8");
const slim = JSON.stringify(catalog.map(({ slug, title: entryTitle, description: entryDescription, date, tags, readingTime, category }) => ({
  slug,
  title: entryTitle,
  description: entryDescription,
  date,
  tags,
  readingTime,
  category,
})));
indexHtml = indexHtml.replace(/(\/\/ BLOG_POSTS_START\s*\n\s*const BLOG_POSTS = )([\s\S]*?)(;\s*\n\s*\/\/ BLOG_POSTS_END)/, `$1${slim}$3`);
const staticCards = catalog.slice(0, 6).map((post, index) => `
      <a href="./posts/${post.slug}" class="blog-card" style="text-decoration:none;">
        <div class="blog-thumb" style="background:linear-gradient(135deg,rgba(45,212,191,0.2),rgba(74,222,128,0.1))">${["🔎", "🧠", "⚡", "🎨", "📊", "🎓"][index]}</div>
        <div class="blog-body">
          <div class="blog-meta"><span class="blog-cat-badge">${post.category || "IA"}</span><span class="blog-date">${post.date || ""}</span></div>
          <h3>${post.title}</h3>
          <p>${post.description}</p>
          <span class="blog-read">Leer artículo →</span>
        </div>
      </a>
    `).join("");
indexHtml = indexHtml.replace(/(<!-- BLOG_GRID_STATIC_START -->)[\s\S]*?(<!-- BLOG_GRID_STATIC_END -->)/, `$1${staticCards}$2`);
fs.writeFileSync(indexPath, indexHtml, "utf8");

console.log(`Catálogo editorial sincronizado: ${catalog.length} posts visibles; ${catalog.length - 1} históricos conservan su URL con noindex.`);