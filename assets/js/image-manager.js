/* =========================================================
   JAZIEL — Image Manager Guard
   Client-side safety/validation layer for admin image inputs.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  const MAX_BYTES = 10 * 1024 * 1024;
  const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

  function toast(message) {
    const root = document.querySelector("#toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast toast-error";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function validUrl(value) {
    try {
      const url = new URL(String(value || "").trim());
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }

  function validateFile(file, label) {
    if (!file) return true;
    if (!TYPES.has(file.type)) {
      toast(`${label} must be JPG, PNG, WebP, or GIF.`);
      return false;
    }
    if (file.size > MAX_BYTES) {
      toast(`${label} is too large. Maximum size is 10 MB.`);
      return false;
    }
    return true;
  }

  function validateFileInput(input) {
    const file = input.files && input.files[0];
    if (!file) return true;
    const label = input.id === "coverFile"
      ? "Cover image"
      : `Body image ${Number(input.dataset.imageFile || 0) + 1}`;
    if (validateFile(file, label)) return true;
    input.value = "";
    return false;
  }

  function validateUrlInput(input) {
    const value = input.value.trim();
    if (!value || validUrl(value)) {
      input.setCustomValidity("");
      return true;
    }
    input.setCustomValidity("Use a valid http(s) image URL.");
    return false;
  }

  // Capture phase works for dynamically-created body image rows too.
  document.addEventListener("change", event => {
    const input = event.target.closest('input[type="file"][accept*="image"]');
    if (input) validateFileInput(input);
  }, true);

  document.addEventListener("input", event => {
    const input = event.target.closest('input[type="url"][id="inCoverUrl"], input[type="url"][data-image-url]');
    if (input) validateUrlInput(input);
  }, true);

  // Final pre-publish guard: stop invalid image inputs before GitHub writes begin.
  document.addEventListener("click", event => {
    const button = event.target.closest("#btnPublish");
    if (!button) return;

    const fileInputs = [...document.querySelectorAll('input[type="file"][accept*="image"]')];
    const urlInputs = [...document.querySelectorAll('input[type="url"][id="inCoverUrl"], input[type="url"][data-image-url]')];
    const filesOk = fileInputs.every(validateFileInput);
    const urlsOk = urlInputs.every(validateUrlInput);

    if (!filesOk || !urlsOk) {
      event.preventDefault();
      event.stopImmediatePropagation();
      toast("Please fix the invalid image file or image URL before publishing.");
    }
  }, true);
})();
