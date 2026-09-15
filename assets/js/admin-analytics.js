/* JAZIEL ADMIN — GA4 Analytics Dashboard
   Browser-only reporting for the static Admin Panel.
   No Google client secret or Analytics credential is stored in the repository.
*/
(() => {
  "use strict";

  const CLIENT_ID = "1038721391867-26pmsn1ar6cgu32b84lg0g1vlik89fe6.apps.googleusercontent.com";
  const PROPERTY_ID = "554479095";
  const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
  const API_ROOT = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}`;

  let accessToken = "";
  let tokenClient = null;
  let activeRoot = null;
  let selectedRange = "7d";

  const escapeHTML = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function isAnalyticsRoute() {
    return window.location.hash.replace(/^#\/?/, "").split("/").filter(Boolean)[0] === "analytics";
  }

  function waitForGIS(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        if (window.google?.accounts?.oauth2) return resolve(window.google.accounts.oauth2);
        if (Date.now() - started >= timeout) return reject(new Error("Google Identity Services did not load. Refresh the Admin Panel and try again."));
        window.setTimeout(check, 100);
      };
      check();
    });
  }

  async function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    const oauth2 = await waitForGIS();
    tokenClient = oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      include_granted_scopes: true,
      callback: (response) => {
        if (response?.error) {
          showError(response.error_description || response.error || "Google authorization failed.");
          return;
        }
        accessToken = response.access_token || "";
        if (!accessToken) {
          showError("Google did not return an access token.");
          return;
        }
        loadDashboard();
      },
      error_callback: (error) => {
        showError(error?.type === "popup_failed_to_open"
          ? "Google sign-in popup could not open. Allow popups for the Admin Panel and try again."
          : "Google authorization could not be completed.");
      }
    });
    return tokenClient;
  }

  async function connectGoogle() {
    try {
      const client = await ensureTokenClient();
      client.requestAccessToken({ prompt: "" });
    } catch (error) {
      showError(error.message || String(error));
    }
  }

  function disconnectGoogle() {
    accessToken = "";
    tokenClient = null;
    if (activeRoot) renderView(activeRoot);
  }

  function rangeConfig(key) {
    if (key === "30d") return { label: "Last 30 days", startDate: "30daysAgo", endDate: "yesterday" };
    if (key === "today") return { label: "Today", startDate: "today", endDate: "today" };
    return { label: "Last 7 days", startDate: "7daysAgo", endDate: "yesterday" };
  }

  async function runReport(body) {
    if (!accessToken) throw new Error("Connect Google Analytics first.");
    const response = await fetch(`${API_ROOT}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (response.status === 401) {
      accessToken = "";
      throw new Error("Google authorization expired. Click Connect Google Analytics again.");
    }
    if (response.status === 403) {
      throw new Error("Google Analytics denied access. Confirm this Google account has access to the Jaziel Story GA4 property and is listed as an OAuth test user.");
    }
    if (!response.ok) {
      let detail = "";
      try {
        const data = await response.json();
        detail = data?.error?.message || "";
      } catch {}
      throw new Error(detail || `Google Analytics API request failed (${response.status}).`);
    }
    return response.json();
  }

  function value(row, index) {
    return row?.metricValues?.[index]?.value || "0";
  }

  function dimension(row, index) {
    return row?.dimensionValues?.[index]?.value || "(not set)";
  }

  function number(value) {
    return Number(value || 0).toLocaleString("en-US");
  }

  function percent(value) {
    const n = Number(value || 0);
    return `${(n * 100).toFixed(1)}%`;
  }

  async function loadReports() {
    const range = rangeConfig(selectedRange);
    const dateRanges = [{ startDate: range.startDate, endDate: range.endDate }];

    const overview = runReport({
      dateRanges,
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "engagementRate" }
      ]
    });

    const articleViews = runReport({
      dateRanges,
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "article_view" } } }
    });

    const topArticles = runReport({
      dateRanges,
      dimensions: [
        { name: "customEvent:article_slug" },
        { name: "customEvent:article_title" }
      ],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "article_view" } } },
      orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
      limit: 10
    });

    const dailyViews = runReport({
      dateRanges,
      dimensions: [{ name: "date" }],
      metrics: [{ name: "eventCount" }],
      dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value: "article_view" } } },
      orderBys: [{ dimension: { dimensionName: "date" }, desc: false }]
    });

    return Promise.all([overview, articleViews, topArticles, dailyViews]);
  }

  function renderReports(data) {
    const [overview, articleViews, topArticles, dailyViews] = data;
    const overviewRow = overview.rows?.[0];
    const articleViewCount = articleViews.rows?.reduce((sum, row) => sum + Number(value(row, 0)), 0) || 0;
    const topRows = topArticles.rows || [];
    const dailyRows = dailyViews.rows || [];

    return `
      <div class="admin-page-title analytics-title-row">
        <div><h1>Analytics</h1><p class="analytics-subtitle">Jaziel Story · GA4 Property ${PROPERTY_ID}</p></div>
        <div class="analytics-actions">
          <button class="btn btn-ghost" type="button" id="analyticsRefresh">↻ Refresh</button>
          <button class="btn btn-ghost" type="button" id="analyticsDisconnect">Disconnect</button>
        </div>
      </div>
      <div class="analytics-toolbar">
        ${["today", "7d", "30d"].map(key => `<button class="btn btn-sm ${selectedRange === key ? "analytics-range-active" : "btn-ghost"}" type="button" data-analytics-range="${key}">${escapeHTML(rangeConfig(key).label)}</button>`).join("")}
        <span class="analytics-range-note">Reporting range: ${escapeHTML(rangeConfig(selectedRange).label)}</span>
      </div>
      <div class="stat-grid analytics-stat-grid">
        <div class="stat-card"><div class="stat-value">${number(value(overviewRow, 0))}</div><div class="stat-label">Active Users</div></div>
        <div class="stat-card"><div class="stat-value">${number(value(overviewRow, 1))}</div><div class="stat-label">Sessions</div></div>
        <div class="stat-card"><div class="stat-value">${number(value(overviewRow, 2))}</div><div class="stat-label">Page Views</div></div>
        <div class="stat-card"><div class="stat-value">${number(articleViewCount)}</div><div class="stat-label">Article Views</div></div>
        <div class="stat-card"><div class="stat-value">${percent(value(overviewRow, 3))}</div><div class="stat-label">Engagement Rate</div></div>
      </div>
      <div class="analytics-grid">
        <div class="panel">
          <h2 class="mt-0">Top Articles</h2>
          ${topRows.length ? `<table class="admin-table"><thead><tr><th>Article</th><th>Views</th></tr></thead><tbody>${topRows.map(row => `<tr><td><div class="analytics-article-title">${escapeHTML(dimension(row, 1))}</div><div class="analytics-slug">${escapeHTML(dimension(row, 0))}</div></td><td>${number(value(row, 0))}</td></tr>`).join("")}</tbody></table>` : `<p class="empty-state">No article_view data for this range yet.</p>`}
        </div>
        <div class="panel">
          <h2 class="mt-0">Article Views by Day</h2>
          ${dailyRows.length ? `<div class="analytics-bars">${dailyRows.map(row => { const count = Number(value(row, 0)); const max = Math.max(...dailyRows.map(r => Number(value(r, 0))), 1); const height = Math.max(4, Math.round((count / max) * 100)); const date = dimension(row, 0); return `<div class="analytics-bar-col"><div class="analytics-bar-value">${count}</div><div class="analytics-bar" style="height:${height}px"></div><div class="analytics-bar-label">${date.slice(4, 6)}/${date.slice(6, 8)}</div></div>`; }).join("")}</div>` : `<p class="empty-state">No daily article_view data for this range yet.</p>`}
        </div>
      </div>
      <p class="analytics-footnote">Data is read directly from Google Analytics. GA4 reporting data can differ from Realtime and may have processing delay.</p>
    `;
  }

  function renderView(root) {
    activeRoot = root;
    if (!isAnalyticsRoute()) return;
    if (!accessToken) {
      root.innerHTML = `
        <div class="admin-page-title"><div><h1>Analytics</h1><p class="analytics-subtitle">GA4 reporting for Jaziel Story</p></div></div>
        <div class="panel analytics-connect-panel">
          <h2 class="mt-0">Connect Google Analytics</h2>
          <p>Authorize this Admin Panel to read the Jaziel Story GA4 property. Only the read-only Analytics scope is requested.</p>
          <button class="btn" type="button" id="analyticsConnect">Connect Google Analytics</button>
          <p class="analytics-security-note">No Google client secret is stored in this repository. The temporary access token stays in this browser session.</p>
        </div>`;
      $("#analyticsConnect", root)?.addEventListener("click", connectGoogle);
      return;
    }
    root.innerHTML = `<div class="panel"><p class="loading-text">Loading Analytics reports…</p></div>`;
    loadDashboard();
  }

  async function loadDashboard() {
    if (!activeRoot || !isAnalyticsRoute() || !accessToken) return;
    try {
      const reports = await loadReports();
      if (!activeRoot || !isAnalyticsRoute()) return;
      activeRoot.innerHTML = renderReports(reports);
      $("#analyticsRefresh", activeRoot)?.addEventListener("click", loadDashboard);
      $("#analyticsDisconnect", activeRoot)?.addEventListener("click", disconnectGoogle);
      $all("[data-analytics-range]", activeRoot).forEach(button => button.addEventListener("click", () => {
        selectedRange = button.dataset.analyticsRange || "7d";
        loadDashboard();
      }));
    } catch (error) {
      if (!activeRoot || !isAnalyticsRoute()) return;
      activeRoot.innerHTML = `<div class="panel"><p class="field-error">${escapeHTML(error.message || String(error))}</p><p><button class="btn btn-ghost" type="button" id="analyticsReconnect">Connect again</button></p></div>`;
      $("#analyticsReconnect", activeRoot)?.addEventListener("click", () => { accessToken = ""; renderView(activeRoot); });
    }
  }

  function $all(selector, root = document) { return [...root.querySelectorAll(selector)]; }
  function $(selector, root = document) { return root.querySelector(selector); }

  function handleRoute() {
    if (!isAnalyticsRoute()) return;
    const root = document.querySelector("#view");
    if (root) window.setTimeout(() => renderView(root), 0);
  }

  window.addEventListener("hashchange", handleRoute);
  window.addEventListener("DOMContentLoaded", handleRoute);
  window.jazielAdminAnalytics = { render: renderView };
})();
