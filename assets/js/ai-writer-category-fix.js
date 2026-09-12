/* =========================================================
   AI WRITER CATEGORY BRIDGE
   Keeps the existing Article Schema v1 unchanged.
   This only connects the existing Admin Category field with
   the existing AI Writer Category Hint/result flow.

   The bridge uses a short-lived, scoped observer only while an AI
   generation is active. It never observes the whole document.
   ========================================================= */
(() => {
  "use strict";

  const category = () => document.getElementById("inCategory");
  const hint = () => document.getElementById("aiCategoryHint");
  const status = () => document.getElementById("aiStatusBox");

  function showError(message) {
    const root = document.getElementById("toastRoot");
    if (root) {
      const toast = document.createElement("div");
      toast.className = "toast toast-error";
      toast.textContent = message;
      root.appendChild(toast);
      setTimeout(() => toast.remove(), 4500);
    } else alert(message);
  }

  function syncCategoryFromHint() {
    const cat = category();
    const h = hint();
    if (!cat || !h) return false;
    const value = h.value.trim();
    if (!value) return false;
    cat.value = value;
    cat.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }

  let watchObserver = null;
  let viewObserver = null;
  let finished = false;

  function stopWatch() {
    watchObserver?.disconnect();
    viewObserver?.disconnect();
    watchObserver = null;
    viewObserver = null;
  }

  function inspectStatus() {
    if (finished) return;
    const box = status();
    if (!box) return;
    const text = box.textContent || "";
    if (/Draft generated\./i.test(text)) {
      const cat = category();
      const h = hint();
      if (cat && h && !cat.value.trim()) syncCategoryFromHint();
      finished = true;
      stopWatch();
      return;
    }
    if (/failed|error/i.test(text) && !/loading|generating/i.test(text)) {
      finished = true;
      stopWatch();
    }
  }

  function startScopedWatch() {
    stopWatch();
    finished = false;

    const box = status();
    if (box) {
      watchObserver = new MutationObserver(inspectStatus);
      watchObserver.observe(box, { childList: true, subtree: true, characterData: true, attributes: true });
      inspectStatus();
      return;
    }

    const view = document.getElementById("view");
    if (!view) return;
    viewObserver = new MutationObserver(() => {
      const next = status();
      if (!next) return;
      viewObserver?.disconnect();
      viewObserver = null;
      watchObserver = new MutationObserver(inspectStatus);
      watchObserver.observe(next, { childList: true, subtree: true, characterData: true, attributes: true });
      inspectStatus();
    });
    viewObserver.observe(view, { childList: true, subtree: true });
  }

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element) || target.id !== "btnGenerateAI") return;

    const cat = category();
    const h = hint();
    if (!cat || !h) return;

    if (!h.value.trim() && cat.value.trim()) {
      h.value = cat.value.trim();
      h.dispatchEvent(new Event("input", { bubbles: true }));
    }

    if (!h.value.trim()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showError("Category is required before using AI Writer. Enter a Category or Category Hint first.");
      return;
    }

    startScopedWatch();
  }, true);
})();
