/* =========================================================
   JAZIEL — Article pagination
   UI-only pagination. Article Schema v1 remains unchanged.
   Max 2 sections per page; defaults to page 1.
   ========================================================= */
(() => {
  "use strict";

  const PAGE_SIZE = 2;

  function getPageNumber(totalPages) {
    const raw = Number.parseInt(new URLSearchParams(window.location.search).get("page"), 10);
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.min(raw, totalPages);
  }

  function totalPagesFor(sections) {
    return Math.max(1, Math.ceil((Array.isArray(sections) ? sections.length : 0) / PAGE_SIZE));
  }

  function paginationHTML(current, total, hrefForPage) {
    if (total <= 1) return "";

    const buttons = Array.from({ length: total }, (_, index) => {
      const page = index + 1;
      const active = page === current;
      return `<a class="article-page-number${active ? " active" : ""}" href="${escapeAttribute(hrefForPage(page))}" aria-current="${active ? "page" : "false"}">${page}</a>`;
    }).join("");

    return `
      <nav class="article-pagination" aria-label="Article pages">
        <div class="article-page-status">Page ${current} of ${total}</div>
        <div class="article-page-numbers">${buttons}</div>
      </nav>
    `;
  }

  function continueHTML(href) {
    return `<a class="article-continue" href="${escapeAttribute(href)}">Continue Reading <span aria-hidden="true">→</span></a>`;
  }

  function sectionHTML(section, index, images) {
    const heading = section && section.heading ? `<h2>${escapeHTML(section.heading)}</h2>` : "";
    const paragraphs = (section && Array.isArray(section.paragraphs) ? section.paragraphs : [])
      .map(p => `<p>${escapeHTML(p)}</p>`).join("");
    const image = Array.isArray(images) && images[index] ? articleImageHTML(images[index]) : "";
    return `${heading}${paragraphs}${image}`;
  }

  function paginatedRenderArticle(root, article) {
    if (!root) return;

    const sections = Array.isArray(article.sections) ? article.sections : [];
    const images = Array.isArray(article.images) ? article.images : [];
    const total = totalPagesFor(sections);
    const current = getPageNumber(total);
    const start = (current - 1) * PAGE_SIZE;
    const pageSections = sections.slice(start, start + PAGE_SIZE);
    const isFirst = current === 1;
    const isLast = current === total;
    const meta = [article.readTime, formatDate(article.date)].filter(Boolean).join(" · ");
    const dek = article.dek || article.description || "";
    const coverHTML = article.cover
      ? `<div class="article-cover"><img src="${escapeAttribute(article.cover)}" alt="${escapeAttribute(article.title || "")}" loading="lazy" decoding="async"></div>`
      : "";

    const articleBase = `article.html?slug=${encodeURIComponent(article.slug || "")}`;
    const hrefForPage = page => page === 1 ? articleBase : `${articleBase}&page=${page}`;
    const nextHref = hrefForPage(current + 1);

    let body = "";
    if (isFirst && article.intro) body += `<p>${escapeHTML(article.intro)}</p>`;
    if (isFirst) body += '<div class="ad-slot article-ad-slot" aria-label="Advertisement"></div>';

    pageSections.forEach((section, offset) => {
      const absoluteIndex = start + offset;
      body += sectionHTML(section, absoluteIndex, images);
      if (offset < pageSections.length - 1) {
        body += '<div class="ad-slot article-ad-slot" aria-label="Advertisement"></div>';
      }
    });

    if (isLast) {
      if (article.bibleVerse) body += renderBibleVerse(article.bibleVerse);
      if (article.closing) body += `<p class="article-closing">${escapeHTML(article.closing)}</p>`;
      body += '<div class="ad-slot article-ad-slot" aria-label="Advertisement"></div>';
    } else {
      body += continueHTML(nextHref);
    }

    const tagsHTML = Array.isArray(article.tags) && article.tags.length
      ? `<div class="tag-list">${article.tags.map(tag => `<a class="tag-chip" href="${escapeAttribute(searchUrl(tag))}">#${escapeHTML(tag)}</a>`).join("")}</div>`
      : "";

    root.innerHTML = `
      <article class="article">
        <p class="back-link"><a href="index.html">← Back to Jaziel</a></p>
        ${article.category ? `<a class="story-category" href="${escapeAttribute(categoryUrl(article.category))}">${escapeHTML(article.category)}</a>` : ""}
        <h1 class="article-title">${escapeHTML(article.title || "")}</h1>
        ${dek ? `<p class="article-dek">${escapeHTML(dek)}</p>` : ""}
        <div class="story-meta">${escapeHTML(meta)}</div>
        ${coverHTML}
        <div class="article-body">${body}</div>
        ${paginationHTML(current, total, hrefForPage)}
        ${tagsHTML}
      </article>
    `;
  }

  function activateStaticPage() {
    if (document.body.dataset.page !== "static-article") return;

    const pages = [...document.querySelectorAll(".article-page-content")];
    if (!pages.length) return;

    const total = pages.length;
    const current = getPageNumber(total);
    pages.forEach((page, index) => {
      page.hidden = index + 1 !== current;
      page.classList.toggle("is-active", index + 1 === current);
    });

    const article = document.querySelector(".article");
    const slug = article?.dataset.slug || "";
    const hrefForPage = page => page === 1 ? "?" : `?page=${page}`;
    const existing = article?.querySelector(".article-pagination");
    if (existing) existing.outerHTML = paginationHTML(current, total, hrefForPage);

    const continueLinks = article ? article.querySelectorAll(".article-continue") : [];
    continueLinks.forEach(link => {
      link.href = `?page=${Math.min(current + 1, total)}`;
    });

    const canonical = `${window.location.origin}/articles/${encodeURIComponent(slug)}.html`;
    const canonicalURL = current === 1 ? canonical : `${canonical}?page=${current}`;
    setMeta('link[rel="canonical"]', "href", canonicalURL);
    setMeta('meta[property="og:url"]', "content", canonicalURL);
  }

  window.renderArticle = paginatedRenderArticle;
  document.addEventListener("DOMContentLoaded", activateStaticPage);
})();

/* Regeneration trigger: keep static generated pages aligned with this helper. */
