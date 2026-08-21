import fs from "fs";
import path from "path";

const duplicateGroups = [
  ["2026-08-15-crea-un-curso-online-con-chatgpt.html", ["2026-06-17-crea-un-curso-online-con-chatgpt.html", "2026-06-18-crea-un-curso-online.html", "2026-06-24-crea-un-curso-online.html", "2026-06-25-crea-un-curso-online-con-chatgpt.html", "2026-06-26-crea-un-curso-online.html", "2026-07-16-crea-un-curso-online.html", "2026-07-19-crea-un-curso-online.html", "2026-07-29-crea-un-curso-online.html", "2026-08-04-crea-un-curso-online.html", "2026-08-10-crea-un-curso-online.html"]],
  ["2026-08-20-errores-comunes-al-escribir-prompts-y-como-evitarlos.html", ["2026-06-14-errores-comunes-en-prompts.html", "2026-06-15-errores-comunes-en-prompts.html", "2026-06-18-errores-comunes-en-prompts.html", "2026-06-21-errores-comunes-al-escribir-prompts.html", "2026-06-24-errores-comunes-en-prompts.html", "2026-06-25-errores-comunes-en-prompts.html", "2026-07-05-errores-comunes-en-prompts.html", "2026-07-12-errores-comunes-en-prompts.html", "2026-07-13-errores-comunes-al-escribir-prompts.html", "2026-07-14-errores-comunes-en-prompts.html", "2026-07-25-errores-en-prompts.html", "2026-08-01-errores-comunes-en-prompts.html", "2026-08-07-errores-comunes-en-prompts.html", "2026-08-12-errores-comunes-en-prompts.html"]],
  ["2026-08-20-prompt-engineering-para-developers-trucos-que-no-conocias.html", ["2026-06-14-prompt-engineering.html", "2026-06-24-prompt-engineering.html", "2026-07-02-prompt-engineering.html", "2026-07-06-prompt-engineering.html", "2026-07-07-prompt-engineering.html", "2026-07-19-prompt-engineering.html", "2026-07-21-prompt-engineering.html", "2026-07-23-prompt-engineering.html", "2026-07-31-prompt-engineering.html", "2026-08-07-prompt-engineering.html", "2026-08-12-prompt-engineering.html"]],
  ["2026-08-16-emails-pro-con-ia.html", ["2026-06-25-prompts-para-emails.html", "2026-07-06-escribe-emails-profesionales-con-ia.html", "2026-07-09-escribiendo-emails-profesionales.html", "2026-07-11-prompts-para-emails.html", "2026-07-24-escribiendo-emails-profesionales.html", "2026-07-26-escribiendo-emails-profesionales.html", "2026-07-30-escribiendo-emails-con-ia.html", "2026-08-05-escribir-emails-con-ia.html", "2026-08-11-escribiendo-emails-profesionales.html"]],
  ["2026-08-15-ia-para-seo.html", ["2026-06-15-ia-para-seo.html", "2026-06-27-ia-para-seo.html", "2026-06-29-ia-para-seo.html", "2026-07-01-ia-para-seo.html", "2026-07-14-ia-para-seo.html", "2026-07-18-ia-para-seo.html", "2026-07-25-ia-para-seo.html", "2026-07-30-ia-para-seo.html", "2026-08-05-ia-para-seo.html", "2026-08-10-ia-para-seo.html"]],
  ["2026-08-14-ideas-de-negocio-con-ia.html", ["2026-06-15-ideas-de-negocio-con-ia.html", "2026-06-28-ideas-de-negocio-con-ia.html", "2026-06-29-ia-para-negocios.html", "2026-06-30-ideas-de-negocio-con-ia.html", "2026-07-01-ideas-denegocio-con-ia.html", "2026-07-04-ideas-de-negocio-con-ia.html", "2026-07-05-ideas-de-negocio-con-ia.html", "2026-07-29-ideas-de-negocio-con-ia.html", "2026-08-04-ideas-de-negocio-con-ia.html", "2026-08-09-ideas-de-negocio-con-ia.html"]],
  ["2026-08-14-imagenes-con-ia.html", ["2026-06-16-imagenes-con-ia.html", "2026-06-27-imagenes-perfectas-con-ia.html", "2026-07-09-imagenes-con-ia.html", "2026-07-15-imagenes-con-ia.html", "2026-07-18-imagenes-con-ia.html", "2026-07-26-imagenes-ia-perfectas.html", "2026-07-27-imagenes-perfectas-con-ia.html", "2026-07-28-imagenes-con-ia.html", "2026-08-03-imagenes-perfectas-con-ia.html", "2026-08-08-imagenes-con-ia.html"]],
  ["2026-08-15-prompts-creativos.html", ["2026-06-16-prompts-creativos.html", "2026-06-19-prompts-creativos.html", "2026-06-20-prompts-creativos.html", "2026-07-04-prompts-creativos.html", "2026-07-13-prompts-creativos.html", "2026-07-21-prompts-creativos.html", "2026-07-22-prompts-creativos.html", "2026-07-29-prompts-creativos.html", "2026-08-04-prompts-creativos.html", "2026-08-09-prompts-creativos.html"]],
  ["2026-08-16-asistente-personal.html", ["2026-06-17-asistente-personal.html", "2026-06-21-asistente-personal.html", "2026-06-26-asistente-personal.html", "2026-06-30-asistente-personal-con-chatgpt.html", "2026-07-02-asistente-personal.html", "2026-07-12-asistente-personal.html", "2026-07-18-asistente-personal.html", "2026-07-23-asistente-personal.html", "2026-07-24-asistente-personal.html", "2026-07-31-asistente-personal.html", "2026-08-06-asistente-personal-con-chatgpt.html", "2026-08-11-asistente-personal.html"]],
  ["2026-08-16-aprende-10-veces-mas-rapido.html", ["2026-06-18-aprende-10-veces-mas-rapido.html", "2026-06-21-aprende-10-veces-mas-rapido.html", "2026-06-22-aprende-10-veces-mas-rapido.html", "2026-07-04-aprende-10-veces-mas-rapido.html", "2026-07-05-aprende-10-veces-mas-rapido.html", "2026-07-08-aprende-10-veces-mas-rapido.html", "2026-07-13-aprende-10-veces-mas-rapido.html", "2026-07-16-aprende-10-veces-mas-rapido.html", "2026-07-17-aprende-10-veces-mas-rapido.html", "2026-07-21-aprende-10-veces-mas-rapido.html", "2026-07-24-aprende-10-veces-mas-rapido.html", "2026-07-30-aprende-10-veces-mas-rapido.html", "2026-08-05-aprende-10-veces-mas-rapido.html", "2026-08-10-aprende-10-veces-mas-rapido.html"]],
  ["2026-08-17-automatiza-tu-negocio.html", ["2026-06-20-automatiza-tu-negocio.html", "2026-06-23-automatiza-tu-negocio.html", "2026-07-01-automatiza-tu-negocio.html", "2026-07-03-automatiza-tu-negocio.html", "2026-07-11-automatiza-tu-negocio.html", "2026-07-24-automatiza-tu-negocio.html", "2026-07-31-automatiza-tu-negocio.html", "2026-08-06-automatiza-tu-negocio.html", "2026-08-12-automatiza-tu-negocio.html"]],
  ["2026-08-13-domina-chatgpt.html", ["2026-06-14-domina-chatgpt.html", "2026-06-19-domina-chatgpt.html", "2026-06-22-domina-chatgpt.html", "2026-06-23-domina-chatgpt.html", "2026-07-15-domina-chatgpt.html", "2026-07-20-domina-chatgpt.html", "2026-07-22-domina-chatgpt.html", "2026-07-27-domina-chatgpt.html", "2026-08-01-domina-chatgpt.html", "2026-08-07-domina-chatgpt.html"]],
  ["2026-08-13-prompts-infalibles.html", ["2026-06-17-escribe-prompts-infalibles.html", "2026-06-22-prompts-infalibles.html", "2026-07-10-prompts-infalibles.html", "2026-07-11-prompts-infalibles.html", "2026-07-16-prompts-infalibles.html", "2026-07-26-escribe-prompts-infalibles.html", "2026-08-02-prompts-infalibles.html", "2026-08-08-prompts-infalibles.html"]],
  ["2026-08-13-10-prompts-de-marketing.html", ["2026-06-23-prompts-para-expertos.html", "2026-07-03-prompts-de-marketing.html", "2026-07-12-10-prompts-de-marketing.html", "2026-07-19-10-prompts-de-marketing.html", "2026-07-23-10-prompts-de-marketing.html", "2026-08-02-prompts-de-marketing.html", "2026-08-08-prompts-de-marketing.html"]],
  ["2026-08-14-contenido-viral.html", ["2026-06-13-crear-contenido-viral.html", "2026-06-29-contenido-viral.html", "2026-06-30-contenido-viral.html", "2026-07-25-prompts-virales.html", "2026-07-28-prompts-virales.html", "2026-08-03-contenido-viral.html", "2026-08-09-prompts-virales.html"]],
];

const postsDir = path.join(process.cwd(), "posts");
const removed = new Set(duplicateGroups.flatMap(([, files]) => files));
let deletedCount = 0;
for (const filename of removed) {
  const filePath = path.join(postsDir, filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    deletedCount += 1;
  }
}

const indexPath = path.join(postsDir, "index.json");
if (fs.existsSync(indexPath)) {
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const filtered = index.filter((post) => !removed.has(post.slug));
  fs.writeFileSync(indexPath, JSON.stringify(filtered, null, 2) + "\n", "utf8");

  const indexHtmlPath = path.join(process.cwd(), "index.html");
  let indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
  const blogPostsRegex = /(\/\/ BLOG_POSTS_START\s*\n\s*const BLOG_POSTS = )[\s\S]*?(;\s*\n\s*\/\/ BLOG_POSTS_END)/;
  indexHtml = indexHtml.replace(blogPostsRegex, `$1${JSON.stringify(filtered.map(({ slug, title, description, date, tags, readingTime, category }) => ({ slug, title, description, date, tags, readingTime, category })))}$2`);
  fs.writeFileSync(indexHtmlPath, indexHtml, "utf8");
}

console.log(`Eliminados ${deletedCount} posts repetitivos; conservados ${duplicateGroups.length} versiones recientes.`);
