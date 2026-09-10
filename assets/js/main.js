/* =========================================================
   JAZIEL — Main JavaScript
   Connects articles.json to the homepage.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadArticles();
  setupSearchButton();
});

/* ---------- Load article data ---------- */

async function loadArticles() {
  try {
    const response = await fetch("data/articles.json", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not load articles.json (${response.status})`);
    }

    const data = await response.json();
    const articles = Array.isArray(data.articles) ? data.articles : [];

    if (!articles.length) return;

    renderFeatured(articles[0]);
    renderLatest(articles);
    renderPopular(articles);
  } catch (error) {
    console.warn("Jaziel article data:", error);
  }
}

/* ---------- Featured ---------- */

function renderFeatured(article) {
  const card = document.querySelector(".featured-card");
  if (!card || !article) return;

  const category = card.querySelector(".story-category");
  const title = card.querySelector("h2");
  const description = card.querySelector("p");
  const meta = card.querySelector(".story-meta");

  if (category) category.textContent = article.category || "Featured Story";
  if (title) title.textContent = article.title || "";
  if (description) {
    description.textContent =
      article.description || article.dek || "";
  }

  if (meta) {
    meta.textContent = [
      article.readTime || "",
      formatDate(article.date)
    ].filter(Boolean).join(" · ");
  }

  card.href = articleUrl(article);
}

/* ---------- Latest Stories ---------- */

function renderLatest(articles) {
  const list = document.querySelector(".story-list");
  if (!list) return;

  list.innerHTML = articles.map(article => `
    <a class="story-card" href="${escapeAttribute(articleUrl(article))}">
      <div
        class="story-thumb"
        ${article.cover ? `style="background-image:url('${escapeAttribute(article.cover)}');background-size:cover;background-position:center"` : ""}
        aria-hidden="true">
      </div>

      <div>
        <div class="story-category">${escapeHTML(article.category || "Story")}</div>
        <h3>${escapeHTML(article.title || "")}</h3>
        <p class="story-excerpt">${escapeHTML(article.description || article.dek || "")}</p>
        <div class="story-meta">
          ${escapeHTML(article.readTime || "")}${article.date ? ` · ${escapeHTML(formatDate(article.date))}` : ""}
        </div>
      </div>
    </a>
  `).join("");
}

/* ---------- Popular ---------- */

function renderPopular(articles) {
  const list = document.querySelector(".popular-list");
  if (!list) return;

  const popularArticles = articles.slice(0, 5);

  list.innerHTML = popularArticles.map(article => `
    <li class="popular-item">
      <a href="${escapeAttribute(articleUrl(article))}">
        <h3>${escapeHTML(article.title || "")}</h3>
        <div class="story-meta">
          ${escapeHTML(article.category || "Trending")} · ${escapeHTML(article.readTime || "")}
        </div>
      </a>
    </li>
  `).join("");
}

/* ---------- Search button ---------- */

function setupSearchButton() {
  const button = document.querySelector(".icon-button");
  if (!button) return;

  button.addEventListener("click", () => {
    const query = window.prompt("Search Jaziel");

    if (!query || !query.trim()) return;

    window.location.href =
      `search.html?q=${encodeURIComponent(query.trim())}`;
  });
}

/* ---------- Helpers ---------- */

function articleUrl(article) {
  if (!article) return "#";

  if (article.slug) {
    return `article.html?slug=${encodeURIComponent(article.slug)}`;
  }

  return "#";
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}
