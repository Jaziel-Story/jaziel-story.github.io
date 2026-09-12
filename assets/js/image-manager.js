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
      return url.protocol === "https:";
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
    input.setCustomValidity("Use a valid HTTPS image URL.");
    return false;
  }

  document.addEventListener("change", event => {
    const input = event.target.closest('input[type="file"][accept*="image"]');
    if (input) validateFileInput(input);
  }, true);

  document.addEventListener("input", event => {
    const input = event.target.closest('input[type="url"][id="inCoverUrl"], input[type="url"][data-image-url]');
    if (input) validateUrlInput(input);
  }, true);

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

/* =========================================================
   JAZIEL — Draft Image Persistence
   Keeps locally selected image Files across browser refreshes.
   Text/article draft remains in the existing localStorage draft
   system; image binary data is stored separately in IndexedDB.
   Article Schema v1 is unchanged.
   ========================================================= */

(() => {
  "use strict";

  const DB_NAME = "jaziel_admin_drafts_v2";
  const STORE_NAME = "images";
  const DRAFTS_KEY = "jaziel_admin_drafts_v1";

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error("IndexedDB is unavailable in this browser.")); return; }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open draft image storage."));
    });
  }

  async function putImage(key, file) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(file, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not save draft image.")); };
    });
  }

  async function getImage(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Could not load draft image."));
      tx.oncomplete = () => db.close();
    });
  }

  async function deleteImage(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error("Could not delete draft image.")); };
    });
  }

  function currentDraftKey() {
    try {
      const drafts = JSON.parse(localStorage.getItem(DRAFTS_KEY) || "{}");
      const slug = (document.querySelector("#inSlug")?.value || "").trim();
      const matches = Object.entries(drafts)
        .filter(([, draft]) => draft && draft.editor && String(draft.editor.slug || "").trim() === slug)
        .sort((a, b) => String(b[1].savedAt || "").localeCompare(String(a[1].savedAt || "")));
      if (matches.length) return matches[0][0];
      return location.hash.includes("/new") ? "new" : (slug || "new");
    } catch { return "new"; }
  }

  function imageKey(draftKey, kind, index = "") { return `${draftKey}::${kind}::${index}`; }

  async function saveDraftImages(draftKey) {
    const coverInput = document.querySelector("#coverFile");
    const coverFile = coverInput?.files?.[0] || null;
    const coverKey = imageKey(draftKey, "cover");
    if (coverFile) await putImage(coverKey, coverFile); else await deleteImage(coverKey);
    const bodyInputs = [...document.querySelectorAll("#bodyImagesList [data-image-file]")];
    const activeKeys = new Set();
    for (const input of bodyInputs) {
      const index = input.dataset.imageFile;
      const file = input.files?.[0] || null;
      const key = imageKey(draftKey, "body", index);
      if (file) { activeKeys.add(key); await putImage(key, file); } else await deleteImage(key);
    }
    for (let i = 0; i < bodyInputs.length; i++) {
      const key = imageKey(draftKey, "body", i);
      if (!activeKeys.has(key)) await deleteImage(key);
    }
  }

  function assignFileToInput(input, file) {
    if (!input || !file) return;
    try {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (error) { console.error("[draft-image-persistence] Could not restore file input", error); }
  }

  async function restoreDraftImages(draftKey) {
    const coverFile = await getImage(imageKey(draftKey, "cover"));
    if (coverFile) assignFileToInput(document.querySelector("#coverFile"), coverFile);
    const bodyInputs = [...document.querySelectorAll("#bodyImagesList [data-image-file]")];
    for (const input of bodyInputs) {
      const file = await getImage(imageKey(draftKey, "body", input.dataset.imageFile));
      if (file) assignFileToInput(input, file);
    }
  }

  function showError(message) {
    const root = document.querySelector("#toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = "toast toast-error";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  document.addEventListener("click", event => {
    const saveButton = event.target.closest("#btnSaveDraft");
    if (saveButton) setTimeout(async () => { try { await saveDraftImages(currentDraftKey()); } catch (error) { console.error("[draft-image-persistence] save failed", error); showError("Draft text was saved, but the draft images could not be saved."); } }, 0);
    const loadButton = event.target.closest("#btnLoadDraft");
    if (loadButton) setTimeout(async () => { try { await restoreDraftImages(currentDraftKey()); } catch (error) { console.error("[draft-image-persistence] restore failed", error); showError("Draft text was loaded, but the draft images could not be restored."); } }, 0);
    const clearButton = event.target.closest("#btnClearDraft");
    if (clearButton) {
      const keyBeforeClear = currentDraftKey();
      setTimeout(async () => {
        try {
          await deleteImage(imageKey(keyBeforeClear, "cover"));
          const bodyInputs = [...document.querySelectorAll("#bodyImagesList [data-image-file]")];
          for (let i = 0; i < bodyInputs.length; i++) await deleteImage(imageKey(keyBeforeClear, "body", i));
        } catch (error) { console.error("[draft-image-persistence] clear failed", error); }
      }, 0);
    }
  });
})();
