/* Jaziel — All Stories page. Article Schema v1 unchanged. */
(() => {
  "use strict";
  document.addEventListener("DOMContentLoaded", async () => {
    const list = document.getElementById("all-stories");
    if (!list) return;
    try {
      const response = await fetch("articles.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`articles.json ${response.status}`);
      const data = await response.json();
      const articles = Array.isArray(data.articles) ? data.articles : [];
      articles.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0));
      const esc = v => String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
      if (!articles.length) { list.innerHTML = '<p class="empty-state">No stories yet.</p>'; return; }
      list.innerHTML = articles.map(a => `<a class="story-card" href="articles/${encodeURIComponent(a.slug)}.html"><div class="story-thumb"${a.cover ? ` style="background-image:url('${esc(a.cover)}');background-size:cover;background-position:center"` : ""} aria-hidden="true"></div><div><div class="story-category">${esc(a.category || "Story")}</div><h3>${esc(a.title || "")}</h3><p class="story-excerpt">${esc(a.description || a.dek || "")}</p><div class="story-meta">${esc(a.readTime || "")}${a.date ? ` · ${esc(a.date)}` : ""}</div></div></a>`).join("");
    } catch (error) {
      console.warn("Jaziel All Stories:", error);
      list.innerHTML = '<p class="empty-state">Stories could not be loaded right now. Please try again later.</p>';
    }
  });
})();
