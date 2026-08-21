import fs from "fs";
import path from "path";

// Script de reparación de emergencia: corrige el <base href> de cualquier
// post que se haya publicado con un valor incorrecto, lo que provoca que
// styles.css y las fuentes no carguen y el post se vea sin formato.
//
// Ya NO reescribe la estructura del post (nav, header, main, footer): todos
// los posts generados por scripts/generate-post.js usan el mismo formato
// moderno (class="post-container"), así que no hace falta migrarlos.
//
// Uso: node scripts/fix-posts.js

const SITE_BASE_PATH = "/";

const postsDir = path.join(process.cwd(), "posts");
const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".html"));

let fixed = 0;

for (const file of files) {
  const filepath = path.join(postsDir, file);
  let html = fs.readFileSync(filepath, "utf8");
  const original = html;

  // 1. Normalizar el <base href> al valor correcto, sea cual sea el que tenga
  html = html.replace(/<base href="[^"]*">/, `<base href="${SITE_BASE_PATH}">`);

  // Si el post no tenía <base> (no debería pasar, pero por si acaso),
  // lo insertamos justo después de <meta charset>.
  if (!/<base href="/.test(html)) {
    html = html.replace(
      /<meta charset="UTF-8">/,
      `<meta charset="UTF-8">\n  <base href="${SITE_BASE_PATH}">`
    );
  }

  // 2. Eliminar cualquier enlace roto a la sección "#sobre-mi" (ya no existe
  // en index.html) que hayan podido dejar versiones antiguas de este script.
  html = html.replace(/<a href="[^"]*#sobre-mi"[^>]*>[\s\S]*?<\/a>\s*/g, "");

  if (html !== original) {
    fs.writeFileSync(filepath, html, "utf8");
    console.log(`✅ Arreglado: ${file}`);
    fixed++;
  }
}

console.log(`\n🎉 ${fixed} posts corregidos de ${files.length} totales`);