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
  if (!file) return file;
  const source = await loadImage(file);
  let width = OG_WIDTH;
  let height = OG_HEIGHT;
  let best = null;
  for (let pass = 0; pass < 6; pass++) {
    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas is unavailable in this browser.");
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height);
    drawCoverCrop(ctx, source, width, height);
    for (const quality of [0.84,0.76,0.68,0.60,0.52,0.44,0.38,0.32,0.28]) {
      best = await canvasBlob(canvas, "image/jpeg", quality);
      if (best.size <= OG_TARGET_BYTES) break;
    }
    if (best && best.size <= OG_TARGET_BYTES) break;
    if (Math.max(width,height) <= 800) break;
    width=Math.max(800,Math.round(width*0.85));
    height=Math.max(420,Math.round(height*0.85));
  }
  if (typeof source.close === "function") source.close();
  if (!best) throw new Error("OG cover compression failed.");
  return makeFile(best, file.name, "jpg", "image/jpeg");
})();
