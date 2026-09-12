import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const read = p => readFileSync(p, "utf8");
const write = (p, s) => writeFileSync(p, s);
const replaceOnce = (text, pattern, replacement, label) => {
  const next = text.replace(pattern, replacement);
  if (next === text) throw new Error(`Patch anchor not found: ${label}`);
  return next;
};

// 1) Remove the optional localStorage PAT helper. PATs stay memory/sessionStorage only.
if (existsSync("admin/index.html")) {
  let h = read("admin/index.html");
  h = h.replace(/\n?<script src="\.\.\/assets\/js\/admin-token-remember\.js" defer><\/script>/, "");
  write("admin/index.html", h);
}

// 2) Make GitHub article writes conflict-safe: never overwrite a newer articles.json.
{
  const p = "admin/admin.js";
  let s = read(p);
  const pattern = /async function saveArticlesArray\(newArray, commitMessage\) \{[\s\S]*?\n\}\n\nfunction nextArticleId/;
  const replacement = `async function saveArticlesArray(newArray, commitMessage) {
  if (!state.articlesLoaded || !state.articlesSha) {
    throw new Error("Articles are not loaded. Reload the admin panel before publishing.");
  }

  const baselineSha = state.articlesSha;
  const latest = await ghGetFile(ARTICLES_PATH);
  if (!latest) throw new Error("articles.json could not be found — refusing to publish.");

  if (latest.sha !== baselineSha) {
    throw new Error("Publish conflict: articles.json changed elsewhere after this editor loaded it. Reload the Articles list, reopen the article, and publish again so no newer changes are overwritten.");
  }

  const payload = { articles: newArray };
  const contentStr = JSON.stringify(payload, null, 2) + "\\n";
  const result = await ghPutFile(ARTICLES_PATH, utf8ToB64(contentStr), commitMessage, latest.sha);

  state.articles = newArray;
  state.articlesSha = result.content ? result.content.sha : null;
  state.categories = uniqueCategories(newArray);
  return result;
}

function nextArticleId`;
  s = replaceOnce(s, pattern, replacement, "saveArticlesArray");
  // HTTPS-only image URLs on an HTTPS GitHub Pages site.
  s = replaceOnce(s, /function isValidImageUrl\(value\) \{[\s\S]*?\n\}/, `function isValidImageUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:";
  } catch {
    return false;
  }
}`, "isValidImageUrl");
  write(p, s);
}

// 3) Remove the known public AI request drafts. Future workflow runs delete request files even on failure.
if (existsSync("admin/ai-requests")) {
  for (const name of readdirSync("admin/ai-requests")) {
    if (name.endsWith(".json")) rmSync(`admin/ai-requests/${name}`, { force: true });
  }
}

// 4) Strong schema-v1 validator. No new fields are introduced.
write(".github/scripts/validate-articles.mjs", `// Dependency-free validator for Jaziel Article Schema v1.\nimport { readFileSync } from "node:fs";\n\nconst PATH = "articles.json";\nfunction fail(messages) {\n  console.error("❌ articles.json failed validation:\\n");\n  messages.forEach(m => console.error(\`  - \${m}\`));\n  process.exit(1);\n}\nlet data;\ntry { data = JSON.parse(readFileSync(PATH, "utf8")); }\ncatch (err) { fail([\`Not valid JSON: \${err.message}\`]); }\nif (!data || !Array.isArray(data.articles)) fail(['Root object must have an "articles" array.']);\n\nconst errors = [];\nconst ids = new Set();\nconst slugs = new Set();\nconst required = ["id","title","slug","description","category","date","intro","closing"];\nconst slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;\nconst isObject = v => v && typeof v === "object" && !Array.isArray(v);\nconst nonEmptyString = v => typeof v === "string" && v.trim().length > 0;\n\nfor (const [index, article] of data.articles.entries()) {\n  const label = \`articles[\${index}]\`;\n  if (!isObject(article)) { errors.push(\`\${label}: must be an object\`); continue; }\n\n  for (const field of required) if (!nonEmptyString(article[field])) errors.push(\`\${label}: "\${field}" must be a non-empty string\`);\n  if (typeof article.readTime !== "string") errors.push(\`\${label}: "readTime" must be a string\`);\n  if (!slugPattern.test(article.slug || "")) errors.push(\`\${label}: slug must contain only lowercase letters, numbers and hyphens\`);\n  if (ids.has(article.id)) errors.push(\`\${label}: duplicate id "\${article.id}"\`); ids.add(article.id);\n  if (slugs.has(article.slug)) errors.push(\`\${label}: duplicate slug "\${article.slug}"\`); slugs.add(article.slug);\n  if (Number.isNaN(new Date(article.date).getTime())) errors.push(\`\${label}: invalid date "\${article.date}"\`);\n  if (article.featured !== undefined && typeof article.featured !== "boolean") errors.push(\`\${label}: "featured" must be boolean\`);\n  if (article.views !== undefined && (!Number.isFinite(article.views) || article.views < 0)) errors.push(\`\${label}: "views" must be a non-negative number\`);\n\n  if (!Array.isArray(article.sections) || article.sections.length === 0) errors.push(\`\${label}: "sections" must be a non-empty array\`);\n  else article.sections.forEach((section, si) => {\n    const sl = \`\${label}.sections[\${si}]\`;\n    if (!isObject(section)) { errors.push(\`\${sl}: must be an object\`); return; }\n    if (!nonEmptyString(section.heading)) errors.push(\`\${sl}.heading must be a non-empty string\`);\n    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0 || !section.paragraphs.every(nonEmptyString)) errors.push(\`\${sl}.paragraphs must be a non-empty array of non-empty strings\`);\n  });\n\n  if (!Array.isArray(article.images)) errors.push(\`\${label}: "images" must be an array\`);\n  else article.images.forEach((image, ii) => {\n    const il = \`\${label}.images[\${ii}]\`;\n    if (typeof image === "string") { if (!nonEmptyString(image)) errors.push(\`\${il}: image path must be non-empty\`); return; }\n    if (!isObject(image)) { errors.push(\`\${il}: must be a string or object\`); return; }\n    if (!nonEmptyString(image.src)) errors.push(\`\${il}.src must be a non-empty string\`);\n    for (const field of ["alt","caption"]) if (image[field] !== undefined && typeof image[field] !== "string") errors.push(\`\${il}.\${field} must be a string when present\`);\n  });\n\n  if (!Array.isArray(article.tags) || !article.tags.every(nonEmptyString)) errors.push(\`\${label}: "tags" must be an array of non-empty strings\`);\n  if (!Array.isArray(article.relatedArticles) || !article.relatedArticles.every(nonEmptyString)) errors.push(\`\${label}: "relatedArticles" must be an array of non-empty strings\`);\n\n  if (article.bibleVerse !== undefined) {\n    if (!isObject(article.bibleVerse)) errors.push(\`\${label}: "bibleVerse" must be an object\`);\n    else {\n      if (!nonEmptyString(article.bibleVerse.text)) errors.push(\`\${label}.bibleVerse.text must be a non-empty string\`);\n      if (!nonEmptyString(article.bibleVerse.reference)) errors.push(\`\${label}.bibleVerse.reference must be a non-empty string\`);\n    }\n  }\n\n  if (!isObject(article.seo)) errors.push(\`\${label}: "seo" must be an object\`);\n  else {\n    if (!nonEmptyString(article.seo.title)) errors.push(\`\${label}.seo.title must be a non-empty string\`);\n    if (!nonEmptyString(article.seo.description)) errors.push(\`\${label}.seo.description must be a non-empty string\`);\n  }\n\n  if (!isObject(article.og)) errors.push(\`\${label}: "og" must be an object\`);\n  else {\n    for (const field of ["title","description","image"]) if (!nonEmptyString(article.og[field])) errors.push(\`\${label}.og.\${field} must be a non-empty string\`);\n  }\n}\nif (errors.length) fail(errors);\nconsole.log(\`✅ articles.json is valid (${data.articles.length} article(s)); Article Schema v1 unchanged.\`);\n`);

// 5) Fix image compression: cover is always JPEG, GIF is converted, and dimensions shrink until <=300KB when possible.
write("assets/js/image-compressor.js", `/* Jaziel admin image compression. Article Schema v1 is unchanged. */\n(() => {\n  "use strict";\n  const OG_W = 1200, OG_H = 630, OG_TARGET = 300 * 1024;\n  const BODY_MAX = 1600, BODY_TARGET = 900 * 1024;\n  let active = 0;\n  const toast = (message, type = "info") => { const root = document.querySelector("#toastRoot"); if (!root) return; const el = document.createElement("div"); el.className = \`toast\${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}\`; el.textContent = message; root.appendChild(el); setTimeout(() => el.remove(), 5000); };\n  const publishDisabled = disabled => { const b = document.querySelector("#btnPublish"); if (!b) return; if (disabled) { b.dataset.imageCompressDisabled = "1"; b.disabled = true; b.title = "Waiting for image compression to finish…"; } else if (!active && b.dataset.imageCompressDisabled === "1") { delete b.dataset.imageCompressDisabled; b.disabled = false; b.title = ""; } };\n  const load = file => window.createImageBitmap ? createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => fallback(file)) : fallback(file);\n  const fallback = file => new Promise((resolve, reject) => { const u = URL.createObjectURL(file), img = new Image(); img.onload = () => { URL.revokeObjectURL(u); resolve(img); }; img.onerror = () => { URL.revokeObjectURL(u); reject(new Error("Could not read image.")); }; img.src = u; });\n  const blob = (canvas, type, quality) => new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Image encoding failed.")), type, quality));\n  const file = (b, name, ext, type) => new File([b], \`${String(name || "image").replace(/\\.[^.]+$/, "")}.\${ext}\`, { type, lastModified: Date.now() });\n  function crop(ctx, source, w, h) { const r = w / h, sr = source.width / source.height; let sx = 0, sy = 0, sw = source.width, sh = source.height; if (sr > r) { sw = source.height * r; sx = (source.width - sw) / 2; } else if (sr < r) { sh = source.width / r; sy = (source.height - sh) / 2; } ctx.drawImage(source, sx, sy, sw, sh, 0, 0, w, h); }\n  async function cover(input) {\n    const source = await load(input); let w = OG_W, h = OG_H, best = null;\n    for (let pass = 0; pass < 5; pass++) {\n      const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d", { alpha: false }); if (!ctx) throw new Error("Canvas unavailable."); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; crop(ctx, source, w, h);\n      for (const q of [0.84,0.76,0.68,0.60,0.52,0.44,0.38,0.32,0.28]) { best = await blob(canvas, "image/jpeg", q); if (best.size <= OG_TARGET) break; }\n      if (best.size <= OG_TARGET || Math.max(w,h) <= 800) break;\n      w = Math.max(800, Math.round(w * 0.85)); h = Math.max(420, Math.round(h * 0.85));\n    }\n    if (typeof source.close === "function") source.close();\n    return file(best, input.name, "jpg", "image/jpeg");\n  }\n  async function body(input) {\n    if (input.type === "image/gif") return input;\n    const source = await load(input); let scale = Math.min(1, BODY_MAX / Math.max(source.width, source.height)); let w = Math.max(1, Math.round(source.width * scale)), h = Math.max(1, Math.round(source.height * scale)); let best = null;\n    for (let pass = 0; pass < 3; pass++) { const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h; const ctx = canvas.getContext("2d", { alpha: true }); if (!ctx) throw new Error("Canvas unavailable."); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high"; ctx.drawImage(source,0,0,w,h); for (const q of [0.82,0.74,0.66,0.60,0.56,0.50]) { best = await blob(canvas,"image/webp",q); if (best.size <= BODY_TARGET) break; } if (best.size <= BODY_TARGET || Math.max(w,h) <= 1000) break; w=Math.max(1000,Math.round(w*0.8)); h=Math.max(1,Math.round(h*0.8)); }\n    if (typeof source.close === "function") source.close(); return best && best.size < input.size ? file(best,input.name,"webp","image/webp") : input;\n  }\n  function replaceInput(input, f) { const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files; input.dispatchEvent(new Event("change", { bubbles:true })); }\n  async function process(input, original) { if (!input || !original || input.dataset.compressing === "1") return; if (!/^image\\/(jpeg|png|webp|gif)$/.test(original.type)) return; input.dataset.compressing="1"; active++; publishDisabled(true); const isCover=input.id==="coverFile", label=isCover?"OG cover":\`Body image \${Number(input.dataset.imageFile||0)+1}\`; const before=original.size; try { const out=isCover?await cover(original):await body(original); if(out!==original){ replaceInput(input,out); const saved=Math.max(0,Math.round((1-out.size/before)*100)); toast(\`\${label} optimized: \${(before/1024).toFixed(1)} KB → \${(out.size/1024).toFixed(1)} KB (\${saved}% smaller).\`,"success"); } } catch(e){ console.error("[image-compressor]",e); toast(\`\${label} compression failed; original will be used.\`,"error"); } finally { delete input.dataset.compressing; active=Math.max(0,active-1); publishDisabled(active>0); } }\n  document.addEventListener("change", e => { const input=e.target.closest('input[type="file"][accept*="image"]'); const f=input?.files?.[0]; if(input&&f) process(input,f); }, true);\n  document.addEventListener("drop", e => { const zone=e.target.closest("#coverDrop"), f=e.dataTransfer?.files?.[0], input=document.querySelector("#coverFile"); if(zone&&f&&input) setTimeout(()=>process(input,f),0); }, true);\n})();\n`);

// 6) HTTPS-only image URL validation in image-manager too.
if (existsSync("assets/js/image-manager.js")) {
  let s = read("assets/js/image-manager.js");
  s = replaceOnce(s, /function isValidImageUrl\(value\) \{[\s\S]*?\n\}/, `function isValidImageUrl(value) {
  try { return new URL(String(value || "").trim()).protocol === "https:"; }
  catch { return false; }
}`, "image-manager isValidImageUrl");
  write("assets/js/image-manager.js", s);
}

// 7) Search all meaningful article text and keep dynamic article image order identical to static pages.
{
  const p = "assets/js/main.js";
  let s = read(p);
  s = replaceOnce(s, /function searchArticles\(articles, query\) \{[\s\S]*?\n\}\n\nfunction [A-Za-z_$][A-Za-z0-9_$]*\(/, `function searchArticles(articles, query) {
  const q = String(query || "").normalize("NFKC").trim().toLowerCase();
  if (!q) return [];
  return articles.filter(article => {
    const sections = Array.isArray(article.sections) ? article.sections : [];
    const sectionText = sections.flatMap(section => [section?.heading, ...(section?.paragraphs || [])]);
    const haystack = [
      article.title, article.description, article.dek, article.category,
      article.intro, article.closing,
      ...sectionText,
      ...(Array.isArray(article.tags) ? article.tags : [])
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

function PLACEHOLDER(`, "searchArticles");
  s = s.replace(/function PLACEHOLDER\(/, "function ");
  s = replaceOnce(s, /function renderArticle\(root, article\) \{[\s\S]*?\n\}\n\nfunction articleImageHTML\(/, `function renderArticle(root, article) {
  if (!root) return;
  const meta = [article.readTime, formatDate(article.date)].filter(Boolean).join(" · ");
  const dek = article.dek || article.description || "";
  const images = Array.isArray(article.images) ? article.images : [];
  let imageIndex = 0;
  const bodyParts = [];
  if (article.intro) bodyParts.push(\`<p>\${escapeHTML(article.intro)}</p>\`);
  for (const section of (Array.isArray(article.sections) ? article.sections : [])) {
    if (section.heading) bodyParts.push(\`<h2>\${escapeHTML(section.heading)}</h2>\`);
    for (const paragraph of (section.paragraphs || [])) bodyParts.push(\`<p>\${escapeHTML(paragraph)}</p>\`);
    if (images[imageIndex]) bodyParts.push(articleImageHTML(images[imageIndex++]));
  }
  while (imageIndex < images.length) bodyParts.push(articleImageHTML(images[imageIndex++]));
  const verseHTML = renderBibleVerse(article.bibleVerse);
  if (verseHTML) bodyParts.push(verseHTML);
  if (article.closing) bodyParts.push(\`<p class="article-closing">\${escapeHTML(article.closing)}</p>\`);
  const tagsHTML = Array.isArray(article.tags) && article.tags.length ? \`<div class="tag-list">\${article.tags.map(tag => \`<a class="tag-chip" href="\${escapeAttribute(searchUrl(tag))}">#\${escapeHTML(tag)}</a>\`).join("")}</div>\` : "";
  const coverHTML = article.cover ? \`<div class="article-cover"><img src="\${escapeAttribute(article.cover)}" alt="\${escapeAttribute(article.title || "")}" loading="lazy" decoding="async"></div>\` : "";
  root.innerHTML = \`
    <article class="article">
      <p class="back-link"><a href="index.html">← Back to Jaziel</a></p>
      \${article.category ? \`<a class="story-category" href="\${escapeAttribute(categoryUrl(article.category))}">\${escapeHTML(article.category)}</a>\` : ""}
      <h1 class="article-title">\${escapeHTML(article.title || "")}</h1>
      \${dek ? \`<p class="article-dek">\${escapeHTML(dek)}</p>\` : ""}
      <div class="story-meta">\${escapeHTML(meta)}</div>
      \${coverHTML}
      <div class="article-body">\${bodyParts.join("")}</div>
      \${tagsHTML}
    </article>
  \`;
}

function articleImageHTML(`, "renderArticle");
  // Normalize category matching to avoid whitespace/case duplicates.
  s = s.replace(/const category = getQueryParam\("category"\);/, 'const category = normalizeCategory(getQueryParam("category"));');
  if (!s.includes("function normalizeCategory(value)")) {
    s = s.replace(/function categoryUrl\(category\) \{/, `function normalizeCategory(value) { return String(value || "").normalize("NFKC").trim().replace(/\\s+/g, " ").toLowerCase(); }\n\nfunction categoryUrl(category) {`);
  }
  s = s.replace(/a\.category\.toLowerCase\(\) === category\.toLowerCase\(\)/g, "normalizeCategory(a.category) === category");
  write(p, s);
}

// 8) Add a real View All page without changing the article schema.
write("all.html", `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <meta name="description" content="All Jaziel stories.">\n  <title>All Stories — Jaziel</title>\n  <link rel="stylesheet" href="assets/css/style.css">\n  <script src="assets/js/main.js" defer></script>\n</head>\n<body data-page="all">\n<header class="site-header"><div class="container header-inner"><a class="logo" href="index.html">JAZIEL</a><div class="header-actions"><button class="icon-button" type="button" aria-label="Search">⌕</button></div></div></header>\n<main><div class="container"><p class="back-link"><a href="index.html">← Back to Jaziel</a></p><section><div class="section-title"><h1>All Stories</h1></div><div class="story-list" id="all-stories"><p class="loading-text">Loading stories…</p></div></section></div></main>\n<footer class="site-footer"><div class="container footer-inner"><div><div class="footer-logo">JAZIEL</div><div>Trending stories, viral moments and news from around the world.</div></div><div class="footer-links"><a href="about.html">About</a><a href="contact.html">Contact</a><a href="privacy.html">Privacy</a><a href="terms.html">Terms</a></div><div>© 2026 Jaziel. All rights reserved.</div></div></footer>\n</body>\n</html>\n`);

// 9) Make the homepage View all link real.
{
  const p = "index.html";
  let s = read(p).replace('<a href="#latest">View all</a>', '<a href="all.html">View all</a>');
  write(p, s);
}

// 10) Convert locally-hosted cover images to JPEG for social compatibility; update cover/og.image only when they point to the same file.
{
  let data = JSON.parse(read("articles.json"));
  let changed = false;
  for (const article of data.articles || []) {
    const cover = String(article.cover || "");
    if (!cover || /^https?:\/\//i.test(cover) || !/\.(webp|png|gif)$/i.test(cover)) continue;
    const source = cover.replace(/^\/+/, "");
    if (!existsSync(source)) continue;
    const target = source.replace(/\.(webp|png|gif)$/i, ".jpg");
    try { execFileSync("convert", [source, "-background", "white", "-alpha", "remove", "-alpha", "off", "-resize", "1200x630^", "-gravity", "center", "-extent", "1200x630", "-quality", "82", target], { stdio: "ignore" }); }
    catch { continue; }
    const relTarget = target.replace(/^\//, "");
    if (existsSync(relTarget)) {
      const old = article.cover;
      article.cover = relTarget;
      if (article.og && article.og.image === old) article.og.image = relTarget;
      changed = true;
    }
  }
  if (changed) write("articles.json", JSON.stringify(data, null, 2) + "\n");
}

// 11) Harden AI workflow: request files are temporary and are removed from the commit even on generation failure.
write(".github/workflows/ai-writer.yml", `name: Jaziel AI Writer\n\non:\n  workflow_dispatch:\n    inputs:\n      request_id:\n        description: "Temporary request ID to process"\n        required: true\n        type: string\n\npermissions:\n  contents: write\n\nconcurrency:\n  group: jaziel-ai-writer-\${{ github.event.inputs.request_id }}\n  cancel-in-progress: false\n\njobs:\n  generate:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout repository\n        uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n      - name: Generate article with Gemini\n        env:\n          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}\n          REQUEST_ID: \${{ github.event.inputs.request_id }}\n        run: node .github/scripts/generate-article.mjs\n      - name: Remove temporary request file\n        if: always()\n        run: rm -f "admin/ai-requests/\${{ github.event.inputs.request_id }}.json"\n      - name: Commit result and cleanup\n        if: always()\n        run: |\n          git config user.name "jaziel-ai-writer[bot]"\n          git config user.email "actions@users.noreply.github.com"\n          git add admin/ai-results admin/ai-requests\n          if git diff --cached --quiet; then\n            echo "Nothing to commit."\n          else\n            git commit -m "AI Writer: result for request \${{ github.event.inputs.request_id }}"\n            git push\n          fi\n`);

// 12) Generate clean static pages from one maintained script; OG metadata is truthful and related stories are loaded directly.
write(".github/scripts/generate-static-pages.mjs", `import { readFileSync, writeFileSync, readdirSync, mkdirSync, unlinkSync } from "node:fs";\n\nconst site = "https://jaziel-story.github.io/";\nconst data = JSON.parse(readFileSync("articles.json", "utf8"));\nconst esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\"/g,"&quot;").replace(/'/g,"&#039;");\nconst abs = p => /^https?:\\/\\//i.test(p || "") ? String(p) : new URL(String(p || "").replace(/^\\/+/,""), site).href;\nconst rel = p => /^https?:\\/\\//i.test(p || "") ? String(p) : `../${String(p || "").replace(/^\\/+/,"")}`;\nconst imageType = p => { const ext = String(p||"").split("?")[0].split(".").pop().toLowerCase(); return ({jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"})[ext] || ""; };\nconst img = x => { const src=typeof x==="string"?x:x?.src; if(!src)return ""; const alt=typeof x==="object"?(x.alt||""):""; const cap=typeof x==="object"?(x.caption||""):""; return `<figure class="article-figure"><img src="${esc(rel(src))}" alt="${esc(alt)}" loading="lazy" decoding="async">${cap?`<figcaption>${esc(cap)}</figcaption>`:""}</figure>`; };\nconst ad = () => '<div class="ad-slot article-ad-slot" aria-label="Advertisement"></div>';\nmkdirSync("articles",{recursive:true});\nconst valid = new Set((data.articles||[]).map(a=>a?.slug).filter(Boolean));\nfor(const name of readdirSync("articles")){ if(name.endsWith(".html") && !valid.has(name.slice(0,-5))) unlinkSync(`articles/${name}`); }\nfor(const a of (data.articles||[])){\n  let body=a.intro?`<p>${esc(a.intro)}</p>`:""; let ii=0;\n  const sections=a.sections||[];\n  for(let si=0;si<sections.length;si++){ const s=sections[si]; if(s.heading)body+=`<h2>${esc(s.heading)}</h2>`; body+=(s.paragraphs||[]).map(p=>`<p>${esc(p)}</p>`).join(""); if(a.images?.[ii])body+=img(a.images[ii++]); if((si+1)%2===0&&si<sections.length-1)body+=ad(); }\n  while(ii<(a.images||[]).length)body+=img(a.images[ii++]);\n  if(a.bibleVerse?.text)body+=`<blockquote class="verse-block"><p>${esc(a.bibleVerse.text)}</p>${a.bibleVerse.reference?`<cite>${esc(a.bibleVerse.reference)}</cite>`:""}</blockquote>`;\n  if(a.closing)body+=`<p class="article-closing">${esc(a.closing)}</p>`;\n  const canonical=`${site}articles/${a.slug}.html`, desc=a.dek||a.description||"", og=a.og?.image||a.cover||"", type=imageType(og);\n  const ogType=type?`<meta property="og:image:type" content="${type}">`:"";\n  const page=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="${esc(a.seo?.description||desc)}"><meta name="theme-color" content="#111111"><title>${esc(a.seo?.title||`${a.title||"Story"} | Jaziel`)}</title><link rel="canonical" href="${esc(canonical)}"><meta property="og:type" content="article"><meta property="og:site_name" content="Jaziel"><meta property="og:title" content="${esc(a.og?.title||a.title||"")}"><meta property="og:description" content="${esc(a.og?.description||desc)}"><meta property="og:image" content="${esc(abs(og))}"><meta property="og:url" content="${esc(canonical)}"><meta property="og:image:alt" content="${esc(a.title||"")}">${ogType}<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(a.og?.title||a.title||"")}"><meta name="twitter:description" content="${esc(a.og?.description||desc)}"><meta name="twitter:image" content="${esc(abs(og))}"><link rel="stylesheet" href="../assets/css/style.css"><script src="../assets/js/main.js" defer></script><script src="../assets/js/related-articles.js" defer></script></head><body data-page="static-article"><header class="site-header"><div class="container header-inner"><a class="logo" href="../index.html">JAZIEL</a><div class="header-actions"><button class="icon-button" type="button" aria-label="Search">⌕</button></div></div></header><main><div class="container"><article class="article"><p class="back-link"><a href="../index.html">← Back to Jaziel</a></p>${a.category?`<a class="story-category" href="../category.html?category=${encodeURIComponent(a.category)}">${esc(a.category)}</a>`:""}<h1 class="article-title">${esc(a.title||"")}</h1>${a.dek?`<p class="article-dek">${esc(a.dek)}</p>`:""}<div class="story-meta">${esc([a.readTime,a.date].filter(Boolean).join(" · "))}</div>${a.cover?`<div class="article-cover"><img src="${esc(rel(a.cover))}" alt="${esc(a.title||"")}" loading="lazy" decoding="async"></div>`:""}${ad()}<div class="article-body">${body}${ad()}</div></article></div></main><footer class="site-footer"><div class="container footer-inner"><div><div class="footer-logo">JAZIEL</div><div>Trending stories, viral moments and news from around the world.</div></div><div class="footer-links"><a href="../about.html">About</a><a href="../contact.html">Contact</a><a href="../privacy.html">Privacy</a><a href="../terms.html">Terms</a></div><div>© 2026 Jaziel. All rights reserved.</div></div></footer></body></html>`;\n  writeFileSync(`articles/${a.slug}.html`,page);\n}\n`);
write(".github/workflows/generate-static-articles.yml", `name: Generate Jaziel static article pages\n\non:\n  push:\n    paths:\n      - "articles.json"\n      - ".github/scripts/generate-static-pages.mjs"\n      - ".github/workflows/generate-static-articles.yml"\n      - "assets/js/related-articles.js"\n  workflow_dispatch:\n\npermissions:\n  contents: write\n\njobs:\n  generate:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Checkout\n        uses: actions/checkout@v4\n      - name: Set up Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: "20"\n      - name: Validate Article Schema v1\n        run: node .github/scripts/validate-articles.mjs\n      - name: Generate static pages\n        run: node .github/scripts/generate-static-pages.mjs\n      - name: Commit generated pages\n        run: |\n          git config user.name "github-actions[bot]"\n          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"\n          git add articles assets/js/generate-static-pages.mjs assets/js/link-fix.js 2>/dev/null || true\n          git add articles assets/js/main.js assets/js/link-fix.js all.html index.html .github/scripts/generate-static-pages.mjs\n          if git diff --cached --quiet; then echo "Nothing to commit."; else git commit -m "Generate static Jaziel articles"; git push; fi\n`);

// 13) Remove the obsolete self-patching audit/related workflows so they cannot create recurring red Actions noise.
for (const p of [".github/workflows/audit-search-category.yml", ".github/workflows/related-articles-static.yml"]) if (existsSync(p)) rmSync(p, { force:true });

// 14) Ensure current public request files and obvious known orphan are gone.
if (existsSync("admin/ai-requests")) for (const n of readdirSync("admin/ai-requests")) if(n.endsWith(".json")) rmSync(`admin/ai-requests/${n}`,{force:true});
if (existsSync("assets/images/articles")) for (const n of readdirSync("assets/images/articles")) if(/my-story-life-work-and-creativity.*body-3.*\.png$/i.test(n)) rmSync(`assets/images/articles/${n}`,{force:true});

console.log("Audit repair patch complete. Article Schema v1 was not changed.");
