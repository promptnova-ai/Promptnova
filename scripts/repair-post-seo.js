import fs from "fs";
import path from "path";

const SITE_BASE = "https://promptnova-ai.github.io/Promptnova";
const postsDir = path.join(process.cwd(), "posts");

for (const filename of fs.readdirSync(postsDir).filter((file) => file.endsWith(".html"))) {
  const filePath = path.join(postsDir, filename);
  let html = fs.readFileSync(filePath, "utf8");
  const url = `${SITE_BASE}/posts/${filename}`;

  if (!html.includes('name="author"')) {
    html = html.replace('  <meta name="description"', '  <meta name="author" content="PromptNova">\n  <meta name="description"');
  }
  if (!html.includes('rel="canonical"')) {
    html = html.replace('  <meta name="description"', `  <meta property="og:url" content="${url}">\n  <link rel="canonical" href="${url}">\n  <meta name="description"`);
  }

  fs.writeFileSync(filePath, html, "utf8");
}

console.log("SEO reparado en los posts históricos");
