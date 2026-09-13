/* =========================================================
   JAZIEL — Advertising integration (Adsterra)
   Loaded on every public page. Responsibilities:
     1. Load Popunder — exactly once per HTML document.
     2. Load Social Bar — exactly once per HTML document.
     3. Fill existing .ad-slot placeholders:
        - .ad-slot.article-ad-slot  -> Native Banner 4:1 for the FIRST
                                       such slot on the page (its
                                       Adsterra snippet uses one fixed
                                       container id, so it can only be
                                       instantiated once per document);
                                       any additional article-ad-slot
                                       positions fall back to the
                                       300x250 / 320x50 banner below
        - .ad-slot (all others)     -> 300x250 (desktop/tablet)
                                       or 320x50 (mobile)
   This file does not touch layout, pagination or article
   data — it only fills the .ad-slot containers that already
   exist in the markup/generator, and never fills the same
   slot twice.
   ========================================================= */
(() => {
  "use strict";

  const MOBILE_QUERY = "(max-width: 759px)";

  const DESKTOP_BANNER_KEY = "d7d5c0071562c8f7cf1c9773733f24c4";
  const MOBILE_BANNER_KEY = "320efe85976f3f342fd35af14d52bbc3";
  const NATIVE_BANNER_CONTAINER_ID = "container-1bcab6550425f1ce18e8f118f6b99bf2";
  const NATIVE_BANNER_SRC =
    "https://pl31316186.profitableratecpmnetwork.com/1bcab6550425f1ce18e8f118f6b99bf2/invoke.js";
  const POPUNDER_SRC =
    "https://pl31316184.profitableratecpmnetwork.com/f3/5b/52/f35b52f91576d2c53bbf5863c3578734.js";
  const SOCIAL_BAR_SRC =
    "https://pl31316185.profitableratecpmnetwork.com/15/c5/51/15c55106a88f7401e45138ca83397064.js";

  /* ---------- Site-wide, once-per-page scripts ---------- */

  function loadScriptOnce(id, src) {
    if (document.getElementById(id)) return;
    if (document.querySelector(`script[src="${src}"]`)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    document.head.appendChild(script);
  }

  function initPopunder() {
    loadScriptOnce("jaziel-ad-popunder", POPUNDER_SRC);
  }

  function initSocialBar() {
    loadScriptOnce("jaziel-ad-socialbar", SOCIAL_BAR_SRC);
  }

  /* ---------- .ad-slot filling ---------- */

  function initNativeBanner(slot) {
    if (slot.dataset.jazielAd) return;
    slot.dataset.jazielAd = "native";

    const container = document.createElement("div");
    container.id = NATIVE_BANNER_CONTAINER_ID;
    slot.appendChild(container);

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = NATIVE_BANNER_SRC;
    slot.appendChild(script);
  }

  function bannerWidthLabel() {
    return window.matchMedia(MOBILE_QUERY).matches ? "mobile" : "desktop";
  }

  function initBanner(slot) {
    const label = bannerWidthLabel();
    if (slot.dataset.jazielAd === label) return;

    slot.innerHTML = "";
    slot.dataset.jazielAd = label;

    const isMobile = label === "mobile";
    const key = isMobile ? MOBILE_BANNER_KEY : DESKTOP_BANNER_KEY;
    const width = isMobile ? 320 : 300;
    const height = isMobile ? 50 : 250;

    const configScript = document.createElement("script");
    configScript.text =
      "atOptions = " +
      JSON.stringify({ key, format: "iframe", height, width, params: {} }) +
      ";";
    slot.appendChild(configScript);

    const invokeScript = document.createElement("script");
    invokeScript.src = `https://www.highrevenueformat.com/${key}/invoke.js`;
    slot.appendChild(invokeScript);
  }

  function fillAdSlots() {
    const nativeCandidates = [];
    document.querySelectorAll(".ad-slot").forEach(slot => {
      if (slot.classList.contains("article-ad-slot")) {
        nativeCandidates.push(slot);
      } else {
        initBanner(slot);
      }
    });

    /* The Adsterra Native Banner snippet targets one hardcoded container
       id (NATIVE_BANNER_CONTAINER_ID). That id must never appear twice in
       the same document, so only the first .article-ad-slot on the page
       (in document order) becomes the Native Banner. Any further
       .article-ad-slot positions on the same page reuse the existing
       300x250 / 320x50 banner instead of an invalid duplicate id. */
    nativeCandidates.forEach((slot, index) => {
      if (index === 0) {
        initNativeBanner(slot);
      } else {
        initBanner(slot);
      }
    });
  }

  /* ---------- Responsive swap between 300x250 / 320x50 ---------- */

  let resizeTimer;
  function handleResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(fillAdSlots, 200);
  }

  /* ---------- Watch for ad-slots added after initial load
     (e.g. article.html renders its content asynchronously) ---------- */

  function observeAdSlots() {
    const target = document.body || document.documentElement;
    if (!target) return;
    const observer = new MutationObserver(fillAdSlots);
    observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    initPopunder();
    initSocialBar();
    fillAdSlots();
    observeAdSlots();
    window.addEventListener("resize", handleResize);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
