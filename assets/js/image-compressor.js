/* =========================================================
   JAZIEL — Admin Image Compressor
   Compresses locally selected cover/body images in the browser
   before the existing admin publish flow uploads them.
   Article Schema v1 remains unchanged.
   ========================================================= */

(() => {
  "use strict";

  const MAX_DIMENSION = 1600;
  const TARGET_BYTES = 900 * 1024;
  const QUALITIES = [0.82, 0.74, 0.66, 0.60, 0.56];
  let activeJobs = 0;

  function showToast(message, type = "info") {
    const root = document.querySelector("#toastRoot");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast${type === "error" ? " toast-error" : type === "success" ? " toast-success" : ""}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }

  function setPublishDisabled(disabled) {
    const button = document.querySelector("#btnPublish");
    if (!button) return;
    if (disabled) {
      button.dataset.imageCompressDisabled = "1";
      button.disabled = true;
      button.title = "Waiting for image compression to finish…";
    } else if (activeJobs === 0 && button.dataset.imageCompressDisabled === "1") {
      delete button.dataset.imageCompressDisabled;
      button.disabled = false;
      button.title = "";
    }
  }

  function loadImage(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => loadImageFallback(file));
    }
    return loadImageFallback(file);
  }

  function loadImageFallback(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read the image."));
      };
      img.src = url;
    });
  }

  function canvasBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("This browser could not encode the compressed image."));
      }, "image/webp", quality);
    });
  }

  function webpFile(blob, originalName) {
    const base = String(originalName || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.webp`, { type: "image/webp", lastModified: Date.now() });
  }

  async function compressImage(file) {
    // Preserve GIF files so animated GIFs are not accidentally flattened.
    if (!file || file.type === "image/gif") return file;

    const source = await loadImage(file);
    const sourceWidth = source.width;
    const sourceHeight = source.height;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, width, height);

    let best = null;
    for (const quality of QUALITIES) {
      const blob = await canvasBlob(canvas, quality);
      best = blob;
      if (blob.size <= TARGET_BYTES) break;
    }

    // One smaller pass for very large/complex images.
    if (best && best.size > TARGET_BYTES && Math.max(width, height) > 1280) {
      const scale2 = 1280 / Math.max(width, height);
      const width2 = Math.max(1, Math.round(width * scale2));
      const height2 = Math.max(1, Math.round(height * scale2));
      canvas.width = width2;
      canvas.height = height2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, width2, height2);
      best = await canvasBlob(canvas, 0.56);
    }

    if (typeof source.close === "function") source.close();
    if (!best) throw new Error("Image compression failed.");

    // Never replace a source with a larger file.
    return best.size < file.size ? webpFile(best, file.name) : file;
  }

  function replaceInputFile(input, file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function labelFor(input) {
    if (input.id === "coverFile") return "Cover image";
    return `Body image ${Number(input.dataset.imageFile || 0) + 1}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB"];
    const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  async function processInput(input, file) {
    if (!input || !file || input.dataset.compressing === "1") return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type) || file.type === "image/gif") return;

    input.dataset.compressing = "1";
    activeJobs += 1;
    setPublishDisabled(true);
    const label = labelFor(input);
    const originalSize = file.size;

    try {
      const compressed = await compressImage(file);
      if (compressed !== file) {
        replaceInputFile(input, compressed);
        const saved = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));
        showToast(`${label} compressed: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (${saved}% smaller).`, "success");
      }
    } catch (error) {
      console.error("[image-compressor]", error);
      showToast(`${label} compression failed. The original image will be used.`, "error");
    } finally {
      delete input.dataset.compressing;
      activeJobs = Math.max(0, activeJobs - 1);
      setPublishDisabled(activeJobs > 0);
    }
  }

  // Capture phase catches dynamically-created body image inputs.
  document.addEventListener("change", event => {
    const input = event.target.closest('input[type="file"][accept*="image"]');
    if (!input) return;
    const file = input.files && input.files[0];
    if (file) processInput(input, file);
  }, true);

  // Cover drag/drop goes through the existing admin drop handler too.
  document.addEventListener("drop", event => {
    const dropZone = event.target.closest("#coverDrop");
    if (!dropZone) return;
    const file = event.dataTransfer?.files?.[0];
    const input = document.querySelector("#coverFile");
    if (file && input) setTimeout(() => processInput(input, file), 0);
  }, true);
})();
