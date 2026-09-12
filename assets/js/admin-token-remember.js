/* =========================================================
   JAZIEL ADMIN — Remember GitHub connection on this device
   Opt-in only. The PAT is stored in this browser's localStorage
   only when the admin explicitly enables the checkbox.
   It is never written to the repository or articles.json.
   ========================================================= */

(() => {
  "use strict";

  const KEY = "jaziel_admin_token_remember_v1";
  const SESSION_KEY = "jaziel_admin_token_v1";

  // Restore an explicitly remembered token before admin.js runs.
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) sessionStorage.setItem(SESSION_KEY, saved);
  } catch {}

  function findTokenInput() {
    return document.querySelector('input[type="password"]');
  }

  function installRememberUI() {
    const input = findTokenInput();
    if (!input || document.querySelector("#rememberGithubTokenRow")) return;

    const field = input.closest(".field") || input.parentElement;
    if (!field) return;

    const row = document.createElement("label");
    row.id = "rememberGithubTokenRow";
    row.className = "checkbox-row";
    row.style.marginTop = "8px";
    row.style.alignItems = "flex-start";
    row.style.cursor = "pointer";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "rememberGithubToken";
    checkbox.checked = !!localStorage.getItem(KEY);
    checkbox.style.marginTop = "3px";

    const text = document.createElement("span");
    text.innerHTML = "<strong>Remember on this device</strong><br><small style=\"color:var(--muted)\">Stay connected after closing or reopening the browser. The PAT is stored only in this browser.</small>";

    row.append(checkbox, text);
    field.appendChild(row);

    checkbox.addEventListener("change", () => {
      const token = String(input.value || "").trim();
      try {
        if (checkbox.checked && token) {
          localStorage.setItem(KEY, token);
          sessionStorage.setItem(SESSION_KEY, token);
        } else if (!checkbox.checked) {
          localStorage.removeItem(KEY);
        }
      } catch {}
    });

    input.addEventListener("input", () => {
      if (!checkbox.checked) return;
      const token = String(input.value || "").trim();
      try {
        if (token) localStorage.setItem(KEY, token);
        else localStorage.removeItem(KEY);
      } catch {}
    });
  }

  function init() {
    installRememberUI();
    const view = document.querySelector("#view");
    if (view) new MutationObserver(installRememberUI).observe(view, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
