/* Jaziel dynamic article flow fix — Article Schema v1 unchanged. */
(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    if (document.body.dataset.page !== "article") return;
    const root = document.getElementById("article-root");
    const slug = new URLSearchParams(location.search).get("slug");
    if (!root || !slug) return;

    try {
      const response = await fetch("articles.json", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const article = Array.isArray(data.articles) ? data.articles.find(a => a && a.slug === slug) : null;
      if (!article) return;

      const esc = value => String(value ?? "")
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      const imageHTML = image => {
        const src = typeof image === "string" ? image : image?.src;
        if (!src) return "";
        const alt = typeof image === "object" ? (image.alt || "") : "";
        const caption = typeof image === "object" ? (image.caption || "") : "";
        return `<figure class="article-figure"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ""}</figure>`;
      };

      const images = Array.isArray(article.images) ? article.images : [];
      let imageIndex = 0;
      const parts = [];
      if (article.intro) parts.push(`<p>${esc(article.intro)}</p>`);
      for (const section of (article.sections || [])) {
        if (section.heading) parts.push(`<h2>${esc(section.heading)}</h2>`);
        for (const paragraph of (section.paragraphs || [])) parts.push(`<p>${esc(paragraph)}</p>`);
        if (images[imageIndex]) parts.push(imageHTML(images[imageIndex++]));
      }
      while (imageIndex < images.length) parts.push(imageHTML(images[imageIndex++]));
      if (article.bibleVerse?.text) parts.push(`<blockquote class="verse-block"><p>${esc(article.bibleVerse.text)}</p>${article.bibleVerse.reference ? `<cite>${esc(article.bibleVerse.reference)}</cite>` : ""}</blockquote>`);
      if (article.closing) parts.push(`<p class="article-closing">${esc(article.closing)}</p>`);

      const existing = root.querySelector(".article");
      if (!existing) return;
      const body = existing.querySelector(".article-body");
      if (body) body.innerHTML = parts.join("");
    } catch (error) {
      console.warn("Jaziel article flow fix:", error);
    }
  });
})();
