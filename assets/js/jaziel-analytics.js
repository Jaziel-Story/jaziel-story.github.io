/* JAZIEL — GA4 site analytics
   Measurement ID: G-HC6NTTN5KP
   Keeps analytics separate from Article Schema v1.
*/
(() => {
  "use strict";

  const MEASUREMENT_ID = "G-HC6NTTN5KP";
  if (!MEASUREMENT_ID || window.__jazielAnalyticsLoaded) return;
  window.__jazielAnalyticsLoaded = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
  document.head.appendChild(script);

  function articleContext() {
    const article = document.querySelector(".article");
    if (!article) return null;

    const title = article.querySelector(".article-title")?.textContent?.trim() || "";
    if (!title) return null;

    const query = new URLSearchParams(window.location.search);
    const slug = article.dataset.slug || query.get("slug") || "";
    if (!slug) return null;

    const page = query.get("page") || "1";
    return {
      slug,
      title,
      page: page === "all" ? "all" : String(Math.max(1, Number.parseInt(page, 10) || 1)),
      viewType: page === "all" ? "all" : "paginated"
    };
  }

  function trackArticleView() {
    const context = articleContext();
    if (!context || typeof window.gtag !== "function") return;

    const key = `${context.slug}|${context.page}`;
    if (document.documentElement.dataset.jazielAnalyticsArticle === key) return;
    document.documentElement.dataset.jazielAnalyticsArticle = key;

    window.gtag("event", "article_view", {
      article_slug: context.slug,
      article_title: context.title,
      article_page: context.page,
      article_view_type: context.viewType
    });
  }

  document.addEventListener("DOMContentLoaded", trackArticleView);

  if (document.body) {
    const observer = new MutationObserver(() => trackArticleView());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }
})();
