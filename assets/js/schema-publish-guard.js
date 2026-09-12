/* =========================================================
   JAZIEL SCHEMA PUBLISH GUARD
   Final browser-side guard for Article Schema v1.

   admin.js handles the actual GitHub publish. This small guard runs
   before that handler and blocks publishing when fields required by
   validate-articles.mjs are visibly incomplete in the editor.

   It does not change Article Schema v1 and does not perform publishing.
   ========================================================= */
(() => {
  "use strict";

  function showError(message) {
    const root = document.getElementById("toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast toast-error";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function value(id) {
    return (document.getElementById(id)?.value || "").trim();
  }

  function validate() {
    const errors = [];

    if (!value("inTitle")) errors.push("Title is required.");
    if (!value("inSlug")) errors.push("Slug is required.");
    if (!value("inCategory")) errors.push("Category is required.");
    if (!value("inDate")) errors.push("Date is required.");
    if (!value("inDescription")) errors.push("Description is required.");
    if (!value("inIntro")) errors.push("Intro is required.");
    if (!value("inClosing")) errors.push("Closing is required.");

    const sectionRows = [...document.querySelectorAll("#sectionsList .repeat-item")];
    if (!sectionRows.length) {
      errors.push("At least one section is required.");
    } else {
      sectionRows.forEach((row, i) => {
        const heading = row.querySelector("[data-section-heading]")?.value.trim() || "";
        const paragraphs = (row.querySelector("[data-section-paragraphs]")?.value || "")
          .split("\n").map(p => p.trim()).filter(Boolean);
        if (!heading) errors.push(`Section ${i + 1} needs a heading.`);
        if (!paragraphs.length) errors.push(`Section ${i + 1} needs at least one paragraph.`);
      });
    }

    if (!value("inSeoTitle")) errors.push("SEO title is required.");
    if (!value("inSeoDesc")) errors.push("SEO description is required.");
    if (!value("inOgTitle")) errors.push("OG title is required.");
    if (!value("inOgDesc")) errors.push("OG description is required.");

    if (!value("inOgImage") && !value("inCoverUrl") && !document.querySelector("#coverFile")?.files?.length) {
      errors.push("OG image or a cover image is required.");
    }

    return errors;
  }

  document.addEventListener("click", event => {
    const button = event.target instanceof Element ? event.target.closest("#btnPublish") : null;
    if (!button) return;

    const errors = validate();
    if (!errors.length) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showError(`Publish blocked: ${errors[0]}${errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}`);
  }, true);
})();
