/* =========================================================
   JAZIEL ADMIN — Numbered Section Labels
   UI helper only. Article Schema v1 remains unchanged.

   Uses editor events instead of a persistent MutationObserver so label
   updates cannot create a DOM-observer feedback loop.
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

  function scheduleUpdate() {
    requestAnimationFrame(updateSectionLabels);
  }

  function init() {
    updateSectionLabels();
    document.addEventListener("click", event => {
      if (event.target.closest?.("#btnAddSection, [data-remove-section]")) scheduleUpdate();
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
