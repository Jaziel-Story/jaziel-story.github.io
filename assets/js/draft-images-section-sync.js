/* JAZIEL ADMIN — keep body-image slots aligned with article sections.
   This helper does not change Article Schema v1 or image storage rules.
*/
(() => {
  "use strict";
  const $all = (s, r = document) => [...r.querySelectorAll(s)];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function sectionHeadings() {
    return $all("[data-section-heading]").map(x => String(x.value || "").trim());
  }

  function imageItems() {
    return $all("#bodyImagesList .repeat-item");
  }

  function setField(el, value) {
    if (!el || String(el.value || "").trim()) return;
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function defaultsFor(heading, index) {
    const h = heading || `Article section ${index + 1}`;
    return {
      alt: `Lizzie Velásquez — ${h}`,
      caption: `Lizzie Velásquez in a moment related to: ${h}.`
    };
  }

  async function syncOnce() {
    const headings = sectionHeadings();
    if (!headings.length) return false;
    const button = document.querySelector("#btnAddImage");
    if (!button) return false;

    let items = imageItems();
    const target = headings.length;
    let changed = false;

    for (let i = items.length; i < target; i++) {
      button.click();
      changed = true;
      await wait(0);
      items = imageItems();
    }

    items.slice(0, target).forEach((item, i) => {
      const defaults = defaultsFor(headings[i], i);
      setField(item.querySelector("[data-image-alt]"), defaults.alt);
      setField(item.querySelector("[data-image-caption]"), defaults.caption);
    });
    return changed;
  }

  function scheduleSync() {
    let attempt = 0;
    const run = async () => {
      attempt += 1;
      try { await syncOnce(); } catch (err) { console.error("Body image section sync failed", err); }
      if (attempt < 4 && imageItems().length < sectionHeadings().length) setTimeout(run, attempt * 150);
    };
    setTimeout(run, 0);
  }

  document.addEventListener("input", e => {
    if (e.target?.matches?.("[data-section-heading]")) scheduleSync();
  });
  document.addEventListener("change", e => {
    if (e.target?.matches?.("[data-section-heading]")) scheduleSync();
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", scheduleSync, { once: true });
  else scheduleSync();
})();
