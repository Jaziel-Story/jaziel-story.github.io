/* =========================================================
   JAZIEL ADMIN — Body Image Picker UI
   Gives every body image the same visual picker style as cover.
   Visual/UI only; existing file input and upload flow are preserved.
   ========================================================= */

(() => {
  "use strict";

  function setInputFile(input, file) {
    try {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (err) {
      console.warn("Could not stage dropped image", err);
    }
  }

  function enhanceItem(item, index) {
    const input = item.querySelector("input[type=\"file\"][data-image-file]");
    if (!input) return;

    input.classList.add("body-image-file-input");
    input.hidden = true;

    let picker = item.querySelector(":scope > .body-image-picker");
    if (!picker) {
      picker = document.createElement("div");
      picker.className = "body-image-picker";
      picker.setAttribute("role", "button");
      picker.tabIndex = 0;
      item.insertBefore(picker, input.parentElement || null);
    }

    let preview = picker.querySelector(".body-image-picker-preview");
    if (!preview) {
      preview = document.createElement("div");
      preview.className = "body-image-picker-preview";
      picker.appendChild(preview);
    }

    let text = picker.querySelector(".body-image-picker-text");
    if (!text) {
      text = document.createElement("div");
      text.className = "body-image-picker-text";
      picker.appendChild(text);
    }

    text.innerHTML = `<strong>Image ${index + 1}</strong><span>Click or drop an image here</span>`;

    const urlInput = item.querySelector("[data-image-url]");
    const currentUrl = urlInput && urlInput.value.trim();
    const file = input.files && input.files[0];
    const objectUrl = file ? URL.createObjectURL(file) : "";
    const imageUrl = objectUrl || currentUrl;

    preview.innerHTML = imageUrl
      ? `<img src="${imageUrl.replace(/&/g, "&amp;").replace(/\"/g, "&quot;")}" alt="">`
      : `<span class="body-image-empty-icon">＋</span>`;

    picker.onclick = () => input.click();
    picker.onkeydown = event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    };

    picker.ondragover = event => {
      event.preventDefault();
      picker.classList.add("dragover");
    };
    picker.ondragleave = () => picker.classList.remove("dragover");
    picker.ondrop = event => {
      event.preventDefault();
      picker.classList.remove("dragover");
      const dropped = event.dataTransfer.files && event.dataTransfer.files[0];
      if (dropped) setInputFile(input, dropped);
    };
  }

  function refresh() {
    const list = document.querySelector("#bodyImagesList");
    if (!list) return;
    [...list.querySelectorAll(":scope > .repeat-item")].forEach(enhanceItem);
  }

  function init() {
    refresh();
    const list = document.querySelector("#bodyImagesList");
    if (list) new MutationObserver(refresh).observe(list, { childList: true, subtree: true });
    document.addEventListener("change", event => {
      if (event.target.matches("#bodyImagesList input[type=\"file\"][data-image-file]")) refresh();
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
