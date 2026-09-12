/* JAZIEL ADMIN — bootstrap repair for legacy malformed newline in admin.js */
(() => {
  "use strict";

  function showLoaderError(error) {
    const view = document.getElementById("view");
    if (view) {
      view.innerHTML = `<div class="panel"><h2>Admin panel could not start</h2><p class="field-error">${String(error && error.message ? error.message : error)}</p></div>`;
    }
    console.error("Jaziel admin bootstrap failed:", error);
  }

  async function boot() {
    try {
      const response = await fetch(`admin.js?runtime-fix=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Could not load admin.js (${response.status}).`);

      let source = await response.text();
      const broken = 'const contentStr = JSON.stringify(payload, null, 2) + "' + "\n" + '";';
      const fixed = 'const contentStr = JSON.stringify(payload, null, 2) + "\\n";';

      if (source.includes(broken)) source = source.replace(broken, fixed);

      new Function(source)();
      if (document.readyState !== "loading") {
        setTimeout(() => document.dispatchEvent(new Event("DOMContentLoaded")), 0);
      }
    } catch (error) {
      showLoaderError(error);
    }
  }

  boot();
})();
