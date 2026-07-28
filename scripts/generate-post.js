import fs from "fs";
import path from "path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const TOPICS = [
  "Los mejores prompts para escribir emails profesionales con IA",
  "Cómo usar la IA para generar ideas de negocio en minutos",
  "Prompts avanzados para crear contenido viral en redes sociales",
  "Guía para dominar ChatGPT en tu trabajo diario",
  "Errores comunes al escribir prompts y cómo evitarlos",
  "Prompt engineering para developers: trucos que no conocías",
  "Cómo construir un asistente personal con ChatGPT y prompts",
  "Los prompts más creativos para diseñadores gráficos",
  "IA para SEO: prompts que posicionan tu contenido",
  "Automatiza tu negocio con prompts inteligentes",
  "Prompts para aprender cualquier cosa 10 veces más rápido",
  "Cómo escribir prompts que nunca fallan",
  "Los 10 prompts más usados por expertos en marketing",
  "Cómo usar ChatGPT para crear un curso online desde cero",
  "Prompts para generar imágenes perfectas con IA",
];

// ── CLASIFICACIÓN AUTOMÁTICA ──
// Mapeo de palabras clave → categoría
const CATEGORY_RULES = [
  {
    cat: "programacion",
    keywords: ["developer", "código", "codigo", "api", "software", "programar", "programación", "programacion", "developer", "script", "web", "app", "github", "función", "base de datos", "backend", "frontend"],
  },
  {
    cat: "marketing",
    keywords: ["marketing", "viral", "redes sociales", "instagram", "seo", "contenido", "publicidad", "anuncio", "campaña", "audiencia", "engagement", "copy", "copywriting", "tiktok", "youtube"],
  },
  {
    cat: "emprendimiento",
    keywords: ["negocio", "startup", "emprender", "empresa", "inversión", "inversion", "producto", "vender", "ventas", "cliente", "automatiza", "automatizar", "ingresos", "monetizar"],
  },
  {
    cat: "estudio",
    keywords: ["aprender", "aprendizaje", "estudiar", "estudio", "curso", "educación", "educacion", "enseñar", "profesor", "examen", "conocimiento", "habilidad", "idioma"],
  },
  {
    cat: "trabajo",
    keywords: ["trabajo", "email", "profesional", "oficina", "reunión", "reunion", "productividad", "carrera", "cv", "entrevista", "jefe", "empresa", "laboral", "informe", "presentación"],
  },
  {
    cat: "personal",
    keywords: ["personal", "hábito", "habito", "motivación", "motivacion", "creatividad", "bienestar", "salud", "mente", "meditación", "meditacion", "psicología", "psicologia", "felicidad", "coach", "vida"],
  },
];

function classifyPost(title, tags = []) {
  const text = `${title} ${tags.join(" ")}`.toLowerCase();

  // Contar coincidencias por categoría
  const scores = CATEGORY_RULES.map((rule) => ({
    cat: rule.cat,
    score: rule.keywords.filter((kw) => text.includes(kw)).length,
  }));

  // Ordenar por puntuación y coger la mayor
  scores.sort((a, b) => b.score - a.score);

  // Si no hay ninguna coincidencia clara, devolver 'general'
  return scores[0].score > 0 ? scores[0].cat : "general";
}

// ── EXTRACCIÓN DE PROMPTS ──
// Busca bloques <pre><code>...</code></pre> dentro del HTML del artículo
// y devuelve el texto plano de cada uno, listo para el botón "Copiar".
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

// Groq a veces mete la etiqueta ("Ejemplo 1: Redacción de correos...") en su propio
// bloque <pre><code>, separado del prompt real. Esto filtra esas etiquetas sueltas.
function isJustALabel(text) {
  const words = text.trim().split(/\s+/).length;
  return /^ejemplo\s*\d*\s*[:.\-]?/i.test(text.trim()) && words <= 8;
}

function extractPrompts(html) {
  if (!html) return [];
  const regex = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;
  const prompts = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = decodeEntities(match[1].replace(/<[^>]+>/g, "")).trim();
    if (text && !isJustALabel(text)) prompts.push(text);
  }
  return prompts;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function randomTopic() {
  return TOPICS[Math.floor(Math.random() * TOPICS.length)];
}

async function generatePost(topic) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 3000,
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `Eres el editor jefe de PromptNova, un blog en español especializado en 
prompt engineering e inteligencia artificial. Tu estilo es claro, práctico y ameno. 
Siempre incluyes ejemplos reales de prompts listos para copiar.
IMPORTANTE: Responde SOLO con JSON válido, sin markdown, sin backticks, sin texto extra.`,
        },
        {
          role: "user",
          content: `Escribe un artículo completo en español sobre: "${topic}"

Devuelve SOLO un objeto JSON con esta estructura exacta:
{
  "title": "Título atractivo del artículo (max 70 chars)",
  "description": "Meta descripción SEO (max 155 chars)",
  "tags": ["tag1", "tag2", "tag3"],
  "readingTime": 5,
  "html": "<article>...contenido completo en HTML semántico...</article>"
}

El campo html debe contener:
- Etiquetas h2, h3, p, ul, li, blockquote
- Al menos 3 ejemplos de prompts dentro de pre y code
- Mínimo 500 palabras
- Sin estilos inline`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error ${response.status}: ${error}`);
  }

  const data = await response.json();
  const raw = data.choices[0].message.content.trim();
  const clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();

  const match = clean.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se encontró JSON válido en la respuesta");
  return JSON.parse(match[0]);
}

function savePost(data, topic) {
  const postsDir = path.join(process.cwd(), "posts");
  fs.mkdirSync(postsDir, { recursive: true });

  const date = today();
  const slug = slugify(data.title || topic);
  const filename = `${date}-${slug}.html`;
  const filepath = path.join(postsDir, filename);

  // Clasificar automáticamente la categoría
  const category = classifyPost(data.title, data.tags);
  console.log(`🏷️  Categoría detectada: ${category}`);

  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <base href="/Promptnova/">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} | PromptNova</title>
  <meta name="description" content="${data.description}">
  <meta property="og:title" content="${data.title} | PromptNova">
  <meta property="og:description" content="${data.description}">
  <meta property="og:type" content="article">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7965643620841539" crossorigin="anonymous"></script>
</head>
<body>

  <nav role="navigation" aria-label="Navegación principal">
    <a href="./#inicio" class="nav-logo">🪐 Prompt<span>Nova</span></a>
    <div class="nav-links">
      <a href="./#inicio">Inicio</a>
      <a href="./#posts">Prompts</a>
      <a href="./#categorias">Categorías</a>
      <a href="./#blog" class="active">Blog</a>
      <a href="./privacidad.html" target="_blank" rel="noopener noreferrer">Privacidad</a>
    </div>
    <div class="hamburger" onclick="toggleMenu()" aria-label="Abrir menú de navegación" aria-expanded="false" aria-controls="mobile-menu" role="button" tabindex="0">
      <span></span><span></span><span></span>
    </div>
  </nav>

  <div class="mobile-menu" id="mobile-menu">
    <a href="./#inicio" onclick="closeMenu()">Inicio</a>
    <a href="./#posts" onclick="closeMenu()">Prompts</a>
    <a href="./#categorias" onclick="closeMenu()">Categorías</a>
    <a href="./#blog" onclick="closeMenu()">Blog</a>
    <a href="./privacidad.html" target="_blank" rel="noopener noreferrer">Privacidad</a>
  </div>

  <main class="post-container">
    <div class="post-header">
      <a href="./" class="post-back">← Volver al inicio</a>
      <span class="post-tag">${data.tags[0] || "IA"}</span>
      <h1>${data.title}</h1>
      <p class="post-meta">
        <time datetime="${date}">${date}</time> · 
        ${data.readingTime} min de lectura · 
        ${data.tags.map((t) => `<span class="tag">${t}</span>`).join(" ")}
      </p>
    </div>

    <div class="post-content">
      ${data.html}
    </div>
  </main>

  <footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="./#inicio" class="nav-logo">🪐 Prompt<span>Nova</span></a>
        <p>Tu copiloto en el universo de la inteligencia artificial.</p>
      </div>
      <div class="footer-col">
        <h4>Explorar</h4>
        <ul>
          <li><a href="./#posts">Todos los prompts</a></li>
          <li><a href="./#blog">Blog</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="./privacidad.html">Política de Privacidad</a></li>
          <li><a href="./terminos.html">Términos de Uso</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© PromptNova ${new Date().getFullYear()} — Todos los derechos reservados.</span>
    </div>
  </footer>

  <script>
    function toggleMenu() {
      const menu = document.getElementById('mobile-menu');
      const btn = document.querySelector('.hamburger');
      const isOpen = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
    function closeMenu() {
      document.getElementById('mobile-menu').classList.remove('open');
      document.querySelector('.hamburger').setAttribute('aria-expanded', 'false');
    }
  </script>
</body>
</html>`;

  fs.writeFileSync(filepath, fullHtml, "utf8");
  console.log(`✅ Post guardado: posts/${filename}`);

  const indexPath = path.join(postsDir, "index.json");
  let index = [];

  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  }

  const prompts = extractPrompts(data.html);
  console.log(`💬 Prompts extraídos: ${prompts.length}`);

  const exists = index.some((p) => p.slug === filename);
  if (!exists) {
    index.unshift({
      slug: filename,
      title: data.title,
      description: data.description,
      date,
      tags: data.tags,
      readingTime: data.readingTime,
      category,                          // ← campo añadido anteriormente
      prompts,                           // ← campo nuevo: array de prompts listos para copiar
    });
  }

  if (index.length > 90) index = index.slice(0, 90);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  console.log(`📋 index.json actualizado — ${index.length} posts en total`);

  return index;
}

// ── SINCRONIZAR index.html ──
// Mantiene el array BLOG_POSTS embebido y la grilla estática de las primeras 6
// tarjetas del blog en index.html, para que el contenido esté visible sin
// depender de JavaScript ni de una petición de red aparte (requisito para que
// AdSense no marque la portada como "pantalla sin contenido del editor").
const CAT_LABELS_SYNC = {
  trabajo: "💼 Trabajo", marketing: "📣 Marketing", programacion: "💻 Programación",
  estudio: "📚 Estudio", personal: "❤️ Personal", emprendimiento: "🚀 Emprendimiento", general: "🌐 General",
};
const EMOJIS_SYNC = ["🧠", "⚡", "🎨", "📊", "🔧", "🎓", "🚀", "💡", "✨", "🤖"];
const GRADIENTS_SYNC = [
  "linear-gradient(135deg,rgba(124,111,247,0.3),rgba(168,156,255,0.1))",
  "linear-gradient(135deg,rgba(244,200,74,0.2),rgba(251,146,60,0.1))",
  "linear-gradient(135deg,rgba(45,212,191,0.2),rgba(74,222,128,0.1))",
  "linear-gradient(135deg,rgba(244,114,182,0.2),rgba(168,85,247,0.1))",
  "linear-gradient(135deg,rgba(251,146,60,0.2),rgba(244,200,74,0.1))",
  "linear-gradient(135deg,rgba(74,222,128,0.2),rgba(45,212,191,0.1))",
];

function renderBlogGridStatic(list) {
  return list
    .map((p, i) => {
      const htmlFile = `./posts/${encodeURIComponent(p.slug)}`;
      const catBadge = p.category ? (CAT_LABELS_SYNC[p.category] || p.category) : (p.tags?.[0] || "IA");
      return `
      <a href="${htmlFile}" class="blog-card" style="text-decoration:none;">
        <div class="blog-thumb" style="background:${GRADIENTS_SYNC[i % GRADIENTS_SYNC.length]}">
          ${EMOJIS_SYNC[i % EMOJIS_SYNC.length]}
        </div>
        <div class="blog-body">
          <div class="blog-meta">
            <span class="blog-cat-badge">${catBadge}</span>
            <span class="blog-date">${p.date || ""}</span>
          </div>
          <h3>${p.title}</h3>
          <p>${p.description}</p>
          <span class="blog-read">Leer artículo →</span>
        </div>
      </a>
    `;
    })
    .join("");
}

function syncIndexHtml(index) {
  const indexHtmlPath = path.join(process.cwd(), "index.html");
  if (!fs.existsSync(indexHtmlPath)) {
    console.log("⚠️  No se encontró index.html en la raíz, se omite la sincronización");
    return;
  }
  let html = fs.readFileSync(indexHtmlPath, "utf8");

  // Solo los campos que el cliente necesita (sin `prompts`, no se usa en index.html)
  const slim = index.map(({ slug, title, description, date, tags, readingTime, category }) => ({
    slug, title, description, date, tags, readingTime, category,
  }));

  // 1) Reemplazar el array BLOG_POSTS embebido
  const blogPostsRegex = /(\/\/ BLOG_POSTS_START\s*\n\s*const BLOG_POSTS = )[\s\S]*?(;\s*\n\s*\/\/ BLOG_POSTS_END)/;
  if (blogPostsRegex.test(html)) {
    html = html.replace(blogPostsRegex, `$1${JSON.stringify(slim)}$2`);
  } else {
    console.log("⚠️  No se encontraron los marcadores BLOG_POSTS_START/END en index.html — se omite ese paso");
  }

  // 2) Reemplazar la grilla estática pre-renderizada (primeras 6 tarjetas)
  const staticGridRegex = /(<!-- BLOG_GRID_STATIC_START -->)[\s\S]*?(<!-- BLOG_GRID_STATIC_END -->)/;
  if (staticGridRegex.test(html)) {
    const newStaticHtml = renderBlogGridStatic(slim.slice(0, 6));
    html = html.replace(staticGridRegex, `$1${newStaticHtml}$2`);
  } else {
    console.log("⚠️  No se encontraron los marcadores BLOG_GRID_STATIC_START/END en index.html — se omite ese paso");
  }

  fs.writeFileSync(indexHtmlPath, html, "utf8");
  console.log("🔄 index.html sincronizado con el nuevo post");
}

// ── SITEMAP ──
// Regenera sitemap.xml con todos los posts actuales cada vez que se publica uno nuevo.
const SITE_BASE = "https://promptnova-ai.github.io/Promptnova";

function syncSitemap(index) {
  const sitemapPath = path.join(process.cwd(), "sitemap.xml");
  const today = new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: `${SITE_BASE}/`, priority: "1.0", lastmod: today },
    { loc: `${SITE_BASE}/privacidad.html`, priority: "0.3", lastmod: today },
    { loc: `${SITE_BASE}/terminos.html`, priority: "0.3", lastmod: today },
  ];
  const postUrls = index.map((p) => ({
    loc: `${SITE_BASE}/posts/${p.slug}`,
    priority: "0.6",
    lastmod: p.date || today,
  }));

  const all = [...staticUrls, ...postUrls];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    all
      .map(
        (u) =>
          `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`🗺️  sitemap.xml actualizado — ${all.length} URLs`);
}

async function main() {
  if (!GROQ_API_KEY) {
    throw new Error("Falta la variable de entorno GROQ_API_KEY");
  }

  const topic = randomTopic();
  console.log(`🤖 Generando post sobre: "${topic}"`);

  const data = await generatePost(topic);
  const updatedIndex = savePost(data, topic);
  syncIndexHtml(updatedIndex);
  syncSitemap(updatedIndex);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
