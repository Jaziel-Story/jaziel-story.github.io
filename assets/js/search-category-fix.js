/* JAZIEL — Search & Category hardening
   Keeps Article Schema v1 unchanged. Enhances client-side discovery and routing. */
(() => {
  const normalize = value => String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
  const articleUrl = slug => `articles/${encodeURIComponent(slug)}.html`;
  const searchUrl = q => `search.html?q=${encodeURIComponent(q)}`;
  const categoryUrl = c => `category.html?category=${encodeURIComponent(c)}`;
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const text = article => {
    const parts = [article.title, article.description, article.dek, article.category, article.intro, article.closing];
    if (Array.isArray(article.tags)) parts.push(...article.tags);
    if (Array.isArray(article.sections)) article.sections.forEach(s => { parts.push(s?.heading); if (Array.isArray(s?.paragraphs)) parts.push(...s.paragraphs); });
    return normalize(parts.filter(Boolean).join(" "));
  };
  const sortLatest = list => [...list].sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
  const card = a => `<a class="story-card" href="${esc(articleUrl(a.slug))}"><div class="story-thumb"${a.cover ? ` style="background-image:url('${esc(a.cover)}');background-size:cover;background-position:center"` : ""} aria-hidden="true"></div><div><div class="story-category">${esc(a.category || "Story")}</div><h3>${esc(a.title || "")}</h3><p class="story-excerpt">${esc(a.description || a.dek || "")}</p><div class="story-meta">${esc(a.readTime || "")}${a.date ? ` · ${esc(a.date)}` : ""}</div></div></a>`;

  document.addEventListener("DOMContentLoaded", async () => {
    const page = document.body.dataset.page;
    if (page !== "search" && page !== "category") return;
    try {
      const response = await fetch("articles.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`articles.json ${response.status}`);
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles : [];
      const results = document.getElementById(page === "search" ? "search-results" : "category-results");
      const status = document.getElementById(page === "search" ? "search-status" : "category-status");
      if (!results || !status) return;

      if (page === "search") {
        const form = document.getElementById("search-form");
        const input = document.getElementById("search-input");
        const run = query => {
          const q = normalize(query);
          if (input) input.value = query || "";
          if (!q) { status.textContent = "Type something to search Jaziel stories."; results.innerHTML = ""; return; }
          const matches = sortLatest(articles.filter(a => text(a).includes(q)));
          status.textContent = matches.length ? `${matches.length} result${matches.length === 1 ? "" : "s"} for “${query.trim()}”` : `No stories found for “${query.trim()}”.`;
          results.innerHTML = matches.map(card).join("");
        };
        run(new URLSearchParams(location.search).get("q") || "");
        if (form) form.addEventListener("submit", e => { e.preventDefault(); const q = input?.value.trim() || ""; history.pushState({}, "", q ? searchUrl(q) : "search.html"); run(q); });
        window.addEventListener("popstate", () => run(new URLSearchParams(location.search).get("q") || ""));
      } else {
        const links = document.getElementById("category-links");
        const map = new Map();
        articles.forEach(a => { const key = normalize(a.category); if (key && !map.has(key)) map.set(key, a.category.trim()); });
        if (links) links.innerHTML = [...map.values()].sort((a,b) => normalize(a).localeCompare(normalize(b))).map(c => `<a class="category-chip" href="${esc(categoryUrl(c))}">${esc(c)}</a>`).join("");
        const requested = (new URLSearchParams(location.search).get("category") || "").trim();
        const canonical = [...map.entries()].find(([key]) => key === normalize(requested))?.[1] || "";
        if (!canonical) { document.title = "Categories | Jaziel"; status.textContent = map.size ? "Choose a category to explore." : "No categories available yet."; results.innerHTML = ""; return; }
        const matches = sortLatest(articles.filter(a => normalize(a.category) === normalize(canonical)));
        document.title = `${canonical} Stories | Jaziel`;
        status.textContent = matches.length ? `${matches.length} stor${matches.length === 1 ? "y" : "ies"} in ${canonical}` : `No stories found in ${canonical} yet.`;
        results.innerHTML = matches.map(card).join("");
      }
    } catch (error) { console.warn("Jaziel Search/Category:", error); }
  });
})();
