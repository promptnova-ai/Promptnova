import fs from "fs";
import path from "path";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SITE_BASE_PATH = "/";
const SITE_BASE = "https://promptnova.me";

// ── FIX A: lista de modelos con fallback ──
// Si el primer modelo falla del todo (agotó sus reintentos), se prueba
// el siguiente. Así un modelo retirado/renombrado o un pico de errores
// en Groq no tumba la publicación del día.
const MODELS = [
  "openai/gpt-oss-120b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
];

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
const CATEGORY_RULES = [
  {
    cat: "programacion",
    keywords: ["developer", "código", "codigo", "api", "software", "programar", "programación", "programacion", "script", "web", "app", "github", "función", "base de datos", "backend", "frontend"],
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
  const scores = CATEGORY_RULES.map((rule) => ({
    cat: rule.cat,
    score: rule.keywords.filter((kw) => text.includes(kw)).length,
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].cat : "general";
}

// ── EXTRACCIÓN DE PROMPTS ──
function decodeEntities(str) {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&");
}

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

function randomTopic(excludeTopics = []) {
  const available = TOPICS.filter((t) => !excludeTopics.includes(t));
  const pool = available.length > 0 ? available : TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── FIX B: validación "dura" vs "blanda" ──
// Palabras y nº de prompts son bloqueantes (son lo que realmente hace
// útil al artículo). La sección de límites/verificación, si falta, se
// autocompleta en vez de descartar todo el artículo.
function normalizePost(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Groq devolvió un artículo vacío o inválido");
  }

  const title = typeof data.title === "string" ? data.title.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  let html = typeof data.html === "string" ? data.html.trim() : "";
  const tags = Array.isArray(data.tags)
    ? data.tags.filter((tag) => typeof tag === "string" && tag.trim()).map((tag) => tag.trim())
    : [];
  const readingTime = Number.isFinite(Number(data.readingTime))
    ? Math.max(1, Math.round(Number(data.readingTime)))
    : 5;
  const wordCount = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;

  if (!title || !description || !html) {
    throw new Error("Groq devolvió un artículo incompleto");
  }
  if (wordCount < 1000) {
    throw new Error(`Groq devolvió un artículo demasiado corto (${wordCount} palabras; mínimo 1000)`);
  }
  if ((html.match(/<pre[^>]*>\s*<code[^>]*>/gi) || []).length < 5) {
    throw new Error("Groq devolvió un artículo sin suficientes ejemplos de prompts (mínimo 5)");
  }
  if (!/<h2[^>]*>[^<]*(limitaciones|errores|comprobar|verificar|medir)/i.test(html)) {
    console.log("⚠️  Sección de límites/verificación ausente — se añade automáticamente");
    html += `\n<h2>Límites y verificación</h2>\n<p>Antes de usar estos prompts en un contexto real, revisa siempre la salida manualmente: los modelos pueden inventar datos, cifras o referencias. Ajusta el prompt y vuelve a comprobar el resultado hasta que se ajuste a lo que necesitas.</p>`;
  }

  return { title, description, tags: tags.length > 0 ? tags : ["IA"], readingTime, html };
}

// ── generación con un modelo concreto (reintentos por errores transitorios) ──
async function generateWithModel(topic, model, maxAttempts = 2) {
  const requestPayload = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: {
      model,
      max_tokens: 4500,
      temperature: 0.8,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "promptnova_post",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              readingTime: { type: "integer" },
              html: { type: "string" },
            },
            required: ["title", "description", "tags", "readingTime", "html"],
            additionalProperties: false,
          },
        },
      },
      messages: [
        {
          role: "system",
          content: `Eres el editor jefe de PromptNova, un blog en español especializado en 
prompt engineering e inteligencia artificial. Tu estilo es claro, práctico y ameno. 
Siempre incluyes ejemplos reales de prompts listos para copiar.
No rellenes el texto con generalidades: aporta criterios propios, casos de uso concretos,
advertencias sobre límites y una forma de comprobar si el resultado mejora. No inventes
citas, estadísticas, testimonios ni resultados de pruebas.
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
- Etiquetas h2, h3, p, ul, li, blockquote y una estructura fácil de escanear
- Entre 5 y 8 ejemplos de prompts dentro de pre y code, explicando cuándo usar cada uno
- Mínimo 1000 palabras originales, sin repetir la introducción entre secciones
- Una sección sobre límites, errores frecuentes o verificación de resultados
- Un caso práctico desarrollado de principio a fin y una checklist accionable
- Una sección final de fuentes o documentación oficial consultada, solo con enlaces reales
- Sin prometer resultados garantizados
- Sin estilos inline`,
        },
      ],
    },
  };

  let response;
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const request = {
      ...requestPayload,
      body: JSON.stringify({
        ...requestPayload.body,
        ...(attempt >= 2 ? { response_format: { type: "json_object" } } : {}),
      }),
    };
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        ...request,
        signal: controller.signal,
      });
      clearTimeout(timeout);
    } catch (error) {
      lastError = error;
      if (attempt < maxAttempts) await wait(Math.min(30000, 2000 * 2 ** (attempt - 1)));
      continue;
    }

    if (response.ok) {
      try {
        const data = await response.json();
        const raw = data.choices?.[0]?.message?.content;
        if (!raw || typeof raw !== "string") {
          throw new Error("Groq no devolvió contenido en la respuesta");
        }

        const clean = raw
          .replace(/^```json\s*/i, "")
          .replace(/```\s*$/i, "")
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .trim();
        try {
          return normalizePost(JSON.parse(clean));
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (!match) throw new Error("Groq no devolvió JSON válido");
          return normalizePost(JSON.parse(match[0]));
        }
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await wait(Math.min(30000, 2000 * 2 ** (attempt - 1)));
          continue;
        }
      }
      break;
    }

    const errorBody = await response.text();
    const retryableJsonError = response.status === 400 && errorBody.includes('"code":"json_validate_failed"');
    lastError = new Error(`Groq API error ${response.status} (modelo ${model}): ${errorBody}`);
    const retryableStatus = [408, 425, 429, 500, 502, 503, 504].includes(response.status);
    if ((retryableStatus || retryableJsonError) && attempt < maxAttempts) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) ? retryAfter * 1000 : Math.min(30000, 2000 * 2 ** (attempt - 1));
      await wait(delay);
      continue;
    }
    // Error no reintentable (p.ej. modelo no encontrado, request inválido):
    // se corta aquí mismo para pasar rápido al siguiente modelo de la lista.
    break;
  }

  if (!response) throw new Error(`No se pudo conectar con Groq (modelo ${model}): ${lastError?.message}`);
  if (!response.ok) throw lastError;
  throw lastError || new Error(`Groq no devolvió un artículo válido (modelo ${model})`);
}

// ── FIX A (continuación): recorre la lista de modelos ──
async function generatePost(topic) {
  let lastError;
  for (const model of MODELS) {
    try {
      return await generateWithModel(topic, model);
    } catch (error) {
      console.error(`⚠️  Falló con modelo "${model}": ${error.message}`);
      lastError = error;
    }
  }
  throw lastError || new Error("Todos los modelos fallaron");
}

function savePost(data, topic) {
  const postsDir = path.join(process.cwd(), "posts");
  fs.mkdirSync(postsDir, { recursive: true });

  const indexPath = path.join(postsDir, "index.json");
  let index = [];
  if (fs.existsSync(indexPath)) {
    const rawIndex = fs.readFileSync(indexPath, "utf8");
    index = JSON.parse(rawIndex);
    if (!Array.isArray(index)) throw new Error("posts/index.json no contiene un array válido");
  }

  const date = today();
  const slug = slugify(data.title || topic);
  const filename = `${date}-${slug}.html`;
  const filepath = path.join(postsDir, filename);

  const category = classifyPost(data.title, data.tags);
  console.log(`🏷️  Categoría detectada: ${category}`);

  const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <base href="${SITE_BASE_PATH}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.title} | PromptNova</title>
  <meta name="description" content="${data.description}">
  <meta name="author" content="PromptNova">
  <meta property="og:title" content="${data.title} | PromptNova">
  <meta property="og:description" content="${data.description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${SITE_BASE}/posts/${filename}">
  <link rel="canonical" href="${SITE_BASE}/posts/${filename}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${SITE_BASE_PATH}styles.css">
  <script src="/consent.js"></script>
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: data.description,
    author: { "@type": "Organization", name: "PromptNova" },
    datePublished: date,
    dateModified: date,
    mainEntityOfPage: `${SITE_BASE}/posts/${filename}`,
  })}</script>
</head>
<body>

  <nav role="navigation" aria-label="Navegación principal">
    <a href="./#inicio" class="nav-logo">🪐 Prompt<span>Nova</span></a>
    <div class="nav-links">
      <a href="./#inicio">Inicio</a>
      <a href="./#posts">Prompts</a>
      <a href="./#categorias">Categorías</a>
      <a href="./#blog" class="active">Blog</a>
      <a href="./editorial.html">Criterio editorial</a>
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
    <a href="./editorial.html">Criterio editorial</a>
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
          <li><a href="./editorial.html">Criterio editorial</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="./privacidad.html">Política de Privacidad</a></li>
          <li><a href="./terminos.html">Términos de Uso</a></li>
          <li><a href="./aviso-legal.html">Aviso Legal</a></li>
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
      category,
      prompts,
      topic,
    });
  }

  if (index.length > 90) index = index.slice(0, 90);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), "utf8");
  console.log(`📋 index.json actualizado — ${index.length} posts en total`);

  return index;
}

// ── SINCRONIZAR index.html ──
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

  const slim = index.map(({ slug, title, description, date, tags, readingTime, category }) => ({
    slug, title, description, date, tags, readingTime, category,
  }));

  const blogPostsRegex = /(\/\/ BLOG_POSTS_START\s*\n\s*const BLOG_POSTS = )[\s\S]*?(;\s*\n\s*\/\/ BLOG_POSTS_END)/;
  if (blogPostsRegex.test(html)) {
    html = html.replace(blogPostsRegex, `$1${JSON.stringify(slim)}$2`);
  } else {
    console.log("⚠️  No se encontraron los marcadores BLOG_POSTS_START/END en index.html — se omite ese paso");
  }

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
function syncSitemap(index) {
  const sitemapPath = path.join(process.cwd(), "sitemap.xml");
  const todayDate = new Date().toISOString().slice(0, 10);

  const staticUrls = [
    { loc: `${SITE_BASE}/`, priority: "1.0", lastmod: todayDate },
    { loc: `${SITE_BASE}/privacidad.html`, priority: "0.3", lastmod: todayDate },
    { loc: `${SITE_BASE}/terminos.html`, priority: "0.3", lastmod: todayDate },
    { loc: `${SITE_BASE}/aviso-legal.html`, priority: "0.3", lastmod: todayDate },
    { loc: `${SITE_BASE}/editorial.html`, priority: "0.5", lastmod: todayDate },
  ];
  const postsDir = path.join(process.cwd(), "posts");
  const postUrls = fs
    .readdirSync(postsDir)
    .filter((file) => file.endsWith(".html"))
    .sort()
    .reverse()
    .filter((file) => !/<meta\s+name=["']robots["'][^>]*noindex/i.test(fs.readFileSync(path.join(postsDir, file), "utf8")))
    .map((file) => ({
      loc: `${SITE_BASE}/posts/${file}`,
      priority: "0.6",
      lastmod: file.slice(0, 10) || todayDate,
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

// ── FIX C + D: fases independientes y reintento por tema ──
async function main() {
  if (!GROQ_API_KEY) {
    throw new Error("Falta la variable de entorno GROQ_API_KEY");
  }

  const indexPath = path.join(process.cwd(), "posts", "index.json");
  const existingIndex = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
    : [];
  const recentTopics = existingIndex
    .slice(0, TOPICS.length - 1)
    .map((p) => p.topic)
    .filter(Boolean);

  // Nota: no reintentamos por tema aquí a propósito — el workflow ya
  // reejecuta este script hasta 2 veces si falla, y cada ejecución elige
  // un tema aleatorio nuevo. Añadir otra capa de reintentos aquí solo
  // suma tiempo y arriesga superar el timeout del job.
  const topic = randomTopic(recentTopics);
  console.log(`🤖 Generando post sobre: "${topic}"`);

  const data = await generatePost(topic);
  const updatedIndex = savePost(data, topic);

  // A partir de aquí el post YA está guardado. Un fallo en estas fases
  // no debe borrar ese éxito ni marcar el run como "nada se publicó".
  try {
    syncIndexHtml(updatedIndex);
  } catch (e) {
    console.error(`⚠️  syncIndexHtml falló (el post ya está guardado): ${e.message}`);
  }
  try {
    syncSitemap(updatedIndex);
  } catch (e) {
    console.error(`⚠️  syncSitemap falló (el post ya está guardado): ${e.message}`);
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
