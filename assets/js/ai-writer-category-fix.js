/* =========================================================
   AI WRITER CATEGORY BRIDGE
   Keeps the existing Article Schema v1 unchanged.
   This only connects the existing Admin Category field with
   the existing AI Writer Category Hint/result flow.
   ========================================================= */
(() => {
  "use strict";

  const category = () => document.getElementById("inCategory");
  const hint = () => document.getElementById("aiCategoryHint");
  const button = () => document.getElementById("btnGenerateAI");
  const status = () => document.getElementById("aiStatusBox");

  function showError(message) {
    const root = document.getElementById("toastRoot");
    if (root) {
      const toast = document.createElement("div");
      toast.className = "toast toast-error";
      toast.textContent = message;
      root.appendChild(toast);
      setTimeout(() => toast.remove(), 4500);
    } else {
      alert(message);
    }
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

  document.addEventListener("click", event => {
    const target = event.target;
    if (!(target instanceof Element) || target.id !== "btnGenerateAI") return;

    const cat = category();
    const h = hint();
    if (!cat || !h) return;

    // If the editor already has a category, reuse it as the AI hint.
    if (!h.value.trim() && cat.value.trim()) {
      h.value = cat.value.trim();
      h.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // The AI result must carry a category back into the editor. Requiring
    // the hint here prevents a successful-looking generation that later
    // fails publish validation because Category is empty.
    if (!h.value.trim()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showError("Category is required before using AI Writer. Enter a Category or Category Hint first.");
    }
  }, true);

  // The existing admin.js owns applyAIResultToEditor(). We intentionally do
  // not duplicate or override that function. Instead, watch the existing
  // status box for the success state and bridge the already-entered hint to
  // the real Category input. Dispatching input lets admin.js update its
  // private state.editor.category through its existing listener.
  const observer = new MutationObserver(() => {
    const box = status();
    if (!box || box.hidden) return;
    const text = box.textContent || "";
    if (!/Draft generated\./i.test(text)) return;

    const cat = category();
    const h = hint();
    if (!cat || !h || cat.value.trim()) return;
    syncCategoryFromHint();
  });

  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
})();
