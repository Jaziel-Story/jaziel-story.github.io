/* =========================================================
   JAZIEL ADMIN — Numbered Section Labels
   UI helper only. Article Schema v1 remains unchanged.
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

  document.addEventListener("DOMContentLoaded", () => {
    updateSectionLabels();

    const sectionsList = document.getElementById("sectionsList");
    if (sectionsList) {
      new MutationObserver(updateSectionLabels).observe(sectionsList, {
        childList: true,
        subtree: true
      });
    }
  });
})();
