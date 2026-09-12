/* JAZIEL ADMIN — runtime source repair
   The existing admin.js contains one malformed newline inside a JS string.
   Repair that source in memory before executing it so the full admin panel
   can boot without rewriting the large admin.js file. */

(() => {
  "use strict";

  function showLoaderError(error) {
    const view = document.getElementById("view");
    if (view) {
      view.innerHTML = `
        <div class="panel">
          <h2>Admin panel could not start</h2>
          <p class="field-error">${String(error && error.message ? error.message : error)}</p>
          <p class="muted">Please refresh this page once. If the problem continues, send this screen to the developer.</p>
        </div>`;
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

      if (source.includes(broken)) {
        source = source.replace(broken, fixed);
        console.info("Jaziel admin: repaired malformed contentStr newline before execution.");
      }

      const run = new Function(source);
      run();

      // admin.js normally registers DOMContentLoaded. If this loader finishes
      // after that event, replay it once so the existing router can initialize.
      if (document.readyState !== "loading") {
        setTimeout(() => document.dispatchEvent(new Event("DOMContentLoaded")), 0);
      }
    } catch (error) {
      showLoaderError(error);
    }
  }

  boot();
})();
