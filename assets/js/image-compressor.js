/* =========================================================
   JAZIEL — Admin Image Compressor
   Social OG mode for cover images + normal compression for body images.
   Article Schema v1 remains unchanged.

   COVER / OG SOCIAL MODE
   - 1200x630 (1.91:1) target
   - JPEG for broad Facebook / WhatsApp / X / LinkedIn compatibility
   - Target <= 300 KB when practical

   BODY IMAGE MODE
   - WebP
   - Target <= 900 KB
   ========================================================= */

(() => {
  "use strict";

  const OG_WIDTH = 1200;
  const OG_HEIGHT = 630;
  const OG_TARGET_BYTES = 300 * 1024;
  const OG_QUALITIES = [0.84, 0.76, 0.68, 0.60, 0.52, 0.44, 0.38];

  const BODY_MAX_DIMENSION = 1600;
  const BODY_TARGET_BYTES = 900 * 1024;
  const BODY_QUALITIES = [0.82, 0.74, 0.66, 0.60, 0.56];

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

  function canvasBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("This browser could not encode the compressed image."));
      }, type, quality);
    });
  }

  function makeFile(blob, originalName, extension, mime) {
    const base = String(originalName || "image").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.${extension}`, { type: mime, lastModified: Date.now() });
  }

  function drawCoverCrop(ctx, source, width, height) {
    const sourceWidth = source.width;
    const sourceHeight = source.height;
    const targetRatio = width / height;
    const sourceRatio = sourceWidth / sourceHeight;

    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (sourceRatio > targetRatio) {
      sw = sourceHeight * targetRatio;
      sx = (sourceWidth - sw) / 2;
    } else if (sourceRatio < targetRatio) {
      sh = sourceWidth / targetRatio;
      sy = (sourceHeight - sh) / 2;
    }

    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, width, height);
  }

  async function compressCover(file) {
    if (!file || file.type === "image/gif") return file;

    const source = await loadImage(file);
    const canvas = document.createElement("canvas");
    canvas.width = OG_WIDTH;
    canvas.height = OG_HEIGHT;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);
    drawCoverCrop(ctx, source, OG_WIDTH, OG_HEIGHT);

    let best = null;
    for (const quality of OG_QUALITIES) {
      const blob = await canvasBlob(canvas, "image/jpeg", quality);
      best = blob;
      if (blob.size <= OG_TARGET_BYTES) break;
    }

    if (typeof source.close === "function") source.close();
    if (!best) throw new Error("OG cover compression failed.");

    // Always use JPEG for the social cover so the published og:image is broadly compatible.
    return makeFile(best, file.name, "jpg", "image/jpeg");
  }

  async function compressBody(file) {
    if (!file || file.type === "image/gif") return file;

    const source = await loadImage(file);
    const sourceWidth = source.width;
    const sourceHeight = source.height;
    const scale = Math.min(1, BODY_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
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
    for (const quality of BODY_QUALITIES) {
      const blob = await canvasBlob(canvas, "image/webp", quality);
      best = blob;
      if (blob.size <= BODY_TARGET_BYTES) break;
    }

    if (best && best.size > BODY_TARGET_BYTES && Math.max(width, height) > 1280) {
      const scale2 = 1280 / Math.max(width, height);
      const width2 = Math.max(1, Math.round(width * scale2));
      const height2 = Math.max(1, Math.round(height * scale2));
      canvas.width = width2;
      canvas.height = height2;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(source, 0, 0, width2, height2);
      best = await canvasBlob(canvas, "image/webp", 0.56);
    }

    if (typeof source.close === "function") source.close();
    if (!best) throw new Error("Image compression failed.");

    // Never replace a body image with a larger file.
    return best.size < file.size ? makeFile(best, file.name, "webp", "image/webp") : file;
  }

  function replaceInputFile(input, file) {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function labelFor(input) {
    if (input.id === "coverFile") return "OG cover";
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
    const isCover = input.id === "coverFile";
    const label = labelFor(input);
    const originalSize = file.size;

    try {
      const compressed = isCover ? await compressCover(file) : await compressBody(file);
      if (compressed !== file) {
        replaceInputFile(input, compressed);
        const saved = Math.max(0, Math.round((1 - compressed.size / originalSize) * 100));
        const mode = isCover ? "OG social cover (1200×630 JPEG)" : "body WebP";
        showToast(`${label} optimized: ${formatBytes(originalSize)} → ${formatBytes(compressed.size)} (${saved}% smaller) · ${mode}.`, "success");
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
