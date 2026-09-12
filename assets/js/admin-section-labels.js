/* =========================================================
   JAZIEL ADMIN — Numbered Section Labels
   UI helper only. Article Schema v1 remains unchanged.

   Uses bounded event-driven refreshes instead of a persistent
   MutationObserver so dynamic editor rendering is covered without
   creating a DOM-observer feedback loop.
   ========================================================= */

(() => {
  "use strict";

  function updateSectionLabels() {
    document.querySelectorAll("#sectionsList .repeat-item").forEach((item, index) => {
      const headingField = item.querySelector("[data-section-heading]");
      const headingLabel = headingField?.closest(".field")?.querySelector("label");
      const paragraphLabel = item.querySelector("[data-section-paragraphs]")?.closest(".field")?.querySelector("label");

      if (headingLabel) headingLabel.textContent = `Heading ${index + 1}`;
      if (paragraphLabel) paragraphLabel.textContent = `Paragraphs for Heading ${index + 1} (one per line)`;
      if (headingField) headingField.placeholder = `Heading ${index + 1}`;
    });
  }

  function scheduleRefreshBurst() {
    [0, 60, 180, 360, 700].forEach(delay => setTimeout(updateSectionLabels, delay));
  }

  function init() {
    updateSectionLabels();

    document.addEventListener("click", event => {
      if (event.target.closest?.("#btnAddSection, [data-remove-section], a[href^=\"#/editor/\"]")) {
        scheduleRefreshBurst();
      }
    }, true);

    window.addEventListener("hashchange", scheduleRefreshBurst);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
