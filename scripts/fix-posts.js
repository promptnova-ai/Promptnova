import fs from "fs";
import path from "path";

const postsDir = path.join(process.cwd(), "posts");
const files = fs.readdirSync(postsDir).filter(f => f.endsWith(".html"));

let fixed = 0;

for (const file of files) {
  const filepath = path.join(postsDir, file);
  let html = fs.readFileSync(filepath, "utf8");

  // Saltar si ya está completamente actualizado
 if (html.includes('<base href="/">') && html.includes('class="post-container"')) {
    console.log(`⏭️  Ya actualizado: ${file}`);
    continue;
  }

  // 1. Eliminar <style> inline previos
  html = html.replace(/<style>[\s\S]*?<\/style>\s*/g, "");

  // 2. Eliminar Google Fonts y preconnect duplicados
  html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>\s*/g, "");
  html = html.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>\s*/g, "");
  html = html.replace(/<link[^>]*preconnect[^>]*>\s*/g, "");

  // 3. Eliminar AdSense duplicado
  html = html.replace(/<script async src="https:\/\/pagead2[^>]*><\/script>\s*/g, "");

  // 4. Eliminar cualquier link CSS antiguo
  html = html
    .replace(/<link rel="stylesheet" href="\.\.\/style\.css">/g, "")
    .replace(/<link rel="stylesheet" href="\.\.\/styles\.css">/g, "")
    .replace(/<link rel="stylesheet" href="\.\/styles\.css">/g, "")
    .replace(/<link rel="stylesheet" href="\/styles\.css">/g, "")
    .replace(/<link rel="stylesheet" href="styles\.css">/g, "");

  // 5. Eliminar base href previo si existe
  html = html.replace(/<base href="[^"]*">\s*/g, "");

  // 6. Insertar base href + fuentes + CSS + AdSense justo después de <meta charset>
 const newLinks = `  <base href="/">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="styles.css">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7965643620841539" crossorigin="anonymous"></script>`;

  html = html.replace(
    /<meta charset="UTF-8">/,
    `<meta charset="UTF-8">\n${newLinks}`
  );

  // 7. Reemplazar nav/header antiguo
  const oldHeader = /<header>[\s\S]*?<\/header>/;
  const newNav = `<nav>
    <div class="nav-inner">
      <a href="index.html" class="logo">🪐 PromptNova</a>
      <ul class="nav-links">
        <li><a href="index.html">Inicio</a></li>
        <li><a href="index.html#posts">Prompts</a></li>
        <li><a href="index.html#categorias">Categorías</a></li>
        <li><a href="index.html#blog" class="active">Blog</a></li>
        <li><a href="index.html#sobre-mi">Sobre mí</a></li>
        <li><a href="privacidad.html">Privacidad</a></li>
      </ul>
      <a href="index.html#posts" class="nav-cta">✨ Explorar</a>
    </div>
  </nav>`;

  if (oldHeader.test(html)) {
    html = html.replace(oldHeader, newNav);
  }

  // 8. Corregir enlaces con rutas absolutas en el nav existente
  html = html.replace(/href="\/#/g, 'href="index.html#');
  html = html.replace(/href="\/"/g, 'href="index.html"');
  html = html.replace(/href="\/privacidad\.html"/g, 'href="privacidad.html"');
  html = html.replace(/href="\/terminos\.html"/g, 'href="terminos.html"');

  // 9. *** CLAVE *** Reemplazar <main class="post"> por la estructura correcta
  // Extraer el contenido del main antiguo
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (mainMatch) {
    const mainContent = mainMatch[1];

    // Extraer h1, meta y article por separado
    const h1Match = mainContent.match(/<h1>([\s\S]*?)<\/h1>/);
    const metaMatch = mainContent.match(/<p class="meta">([\s\S]*?)<\/p>/);
    const articleMatch = mainContent.match(/<article>([\s\S]*?)<\/article>/);

    const h1 = h1Match ? h1Match[1] : "";
    const meta = metaMatch ? metaMatch[1] : "";
    const articleContent = articleMatch ? articleMatch[1] : mainContent;

    const newMain = `<main class="post-container">
    <div class="post-header">
      <a href="index.html" class="post-back">← Volver al inicio</a>
      <h1>${h1}</h1>
      <p class="post-meta">${meta}</p>
    </div>
    <div class="post-content">
      ${articleContent}
    </div>
  </main>`;

    html = html.replace(/<main[\s\S]*?<\/main>/, newMain);
  }

  // 10. Actualizar footer
  const oldFooter = /<footer>[\s\S]*?<\/footer>/;
  const newFooter = `<footer>
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="index.html" class="logo">🪐 PromptNova</a>
        <p>Tu copiloto en el universo de la inteligencia artificial.</p>
      </div>
      <div class="footer-col">
        <h4>Explorar</h4>
        <ul>
          <li><a href="index.html#posts">Todos los prompts</a></li>
          <li><a href="index.html#blog">Blog</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Legal</h4>
        <ul>
          <li><a href="privacidad.html">Política de Privacidad</a></li>
          <li><a href="terminos.html">Términos de Uso</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© PromptNova ${new Date().getFullYear()} — Todos los derechos reservados.</span>
    </div>
  </footer>`;

  if (oldFooter.test(html)) {
    html = html.replace(oldFooter, newFooter);
  }

  fs.writeFileSync(filepath, html, "utf8");
  console.log(`✅ Arreglado: ${file}`);
  fixed++;
}

console.log(`\n🎉 ${fixed} posts actualizados de ${files.length} totales`);
