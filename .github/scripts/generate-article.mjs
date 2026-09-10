// Runs inside GitHub Actions only. Reads a request file the Admin Panel
// committed to admin/ai-requests/<id>.json, calls Gemini using the
// GEMINI_API_KEY secret (never exposed to the browser), and writes the
// structured result to admin/ai-results/<id>.json for the Admin Panel to
// poll and load into the editor. On any failure, writes
// admin/ai-results/<id>.error.json instead — the panel never sees a false
// success.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";

/* =========================================================
   MODEL CONFIG — single place to change the Gemini model.
   =========================================================
   gemini-2.0-flash was retired and no longer serves requests.
   gemini-3.8-flash is Google's current "Stable" (GA), most
   capable Flash model as of this writing — it supports
   generateContent, structured JSON output (responseSchema),
   and is intended for production workloads like this one.
   Override with the GEMINI_MODEL repo/workflow variable if
   Google ships a newer recommended model later; no other file
   needs to change.
   ========================================================= */
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

const GEMINI_TIMEOUT_MS = 55_000;   // keep well under GitHub Actions' step limits
const GEMINI_MAX_ATTEMPTS = 3;      // 1 initial try + 2 retries, per Langkah 22
const GEMINI_RETRY_BASE_MS = 2_000; // simple backoff: 2s, then 4s

const requestId = process.env.REQUEST_ID;
const apiKey = process.env.GEMINI_API_KEY;

const REQUEST_PATH = `admin/ai-requests/${requestId}.json`;
const RESULT_PATH = `admin/ai-results/${requestId}.json`;
const ERROR_PATH = `admin/ai-results/${requestId}.error.json`;

mkdirSync("admin/ai-results", { recursive: true });

function writeError(message) {
  // Never let a raw error object (which could echo back request headers,
  // etc.) reach disk — only a plain string message we constructed.
  writeFileSync(ERROR_PATH, JSON.stringify({ message: String(message), at: new Date().toISOString() }, null, 2) + "\n");
  console.error("AI Writer error:", message);
}

async function main() {
  if (!requestId) throw new Error("No request_id was provided to the workflow.");
  if (!apiKey) throw new Error("GEMINI_API_KEY secret is not configured on this repository. Add it in Settings → Secrets and variables → Actions.");
  if (!existsSync(REQUEST_PATH)) throw new Error(`Request file ${REQUEST_PATH} was not found (it may have already been processed).`);

  const request = JSON.parse(readFileSync(REQUEST_PATH, "utf8"));
  const { rawText, titleHint, categoryHint, instructions } = request;

  if (!rawText || !rawText.trim()) throw new Error("Request had no raw article text.");

  const prompt = buildPrompt({ rawText, titleHint, categoryHint, instructions });
  const draft = await callGeminiWithRetry(prompt);
  const validated = validateDraft(draft);
  const article = { ...validated, readTime: computeReadTime(validated) };

  writeFileSync(RESULT_PATH, JSON.stringify(article, null, 2) + "\n");
  console.log(`Wrote ${RESULT_PATH} (model: ${GEMINI_MODEL})`);

  // Clean up the request file now that it's been processed.
  try { rmSync(REQUEST_PATH); } catch { /* non-fatal */ }
}

/* =========================================================
   PROMPT
   ========================================================= */

function buildPrompt({ rawText, titleHint, categoryHint, instructions }) {
  return `You are a news rewriting assistant for a trending-stories site called Jaziel.
Rewrite the raw article text below into the site's article format.

Rules:
- Do not invent facts, quotes, statistics, or sources that are not present in the raw article text.
- If information is missing, write around it safely rather than making it up.
- Keep the tone natural, readable, and engaging for a mobile-friendly trending-stories site — not clickbait, not a raw AI-sounding wall of text.
- Only mention a Bible verse or faith framing if the raw article is genuinely about Christian/faith topics, or the instructions below explicitly ask for one. Otherwise leave it out entirely (do not include a bibleVerse field at all).

Respond with ONLY a single JSON object (no markdown fences, no comments, no text outside the JSON) with exactly these keys:
{
  "title": string,
  "description": string (one sentence, under 160 characters),
  "dek": string (one engaging sentence subtitle, distinct from the description),
  "intro": string (1-2 sentences opening the story),
  "sections": [ { "heading": string, "paragraphs": [string, ...] }, ... ],
  "closing": string (1-2 sentence closing),
  "tags": [string, ...] (3-6 relevant lowercase single or two-word tags),
  "seoTitle": string (under 60 characters),
  "seoDescription": string (under 160 characters),
  "bibleVerse": { "text": string, "reference": string } (OMIT this key entirely unless it is genuinely warranted, per the rule above)
}

${titleHint ? `Suggested title direction: ${titleHint}` : ""}
${categoryHint ? `Category: ${categoryHint}` : ""}
${instructions ? `Additional instructions from the editor: ${instructions}` : ""}

Raw article text:
"""
${rawText}
"""`;
}

/* =========================================================
   GEMINI CALL (generateContent, structured JSON output)
   ========================================================= */

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    dek: { type: "string" },
    intro: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } }
        },
        required: ["heading", "paragraphs"]
      }
    },
    closing: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    bibleVerse: {
      type: "object",
      properties: {
        text: { type: "string" },
        reference: { type: "string" }
      }
    }
  },
  required: ["title", "description", "dek", "intro", "sections", "closing", "tags", "seoTitle", "seoDescription"]
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Retries only on transient failures (network errors, timeouts, 429, 5xx). */
async function callGeminiWithRetry(prompt) {
  let lastErr;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try {
      return await callGemini(prompt);
    } catch (err) {
      lastErr = err;
      const transient = err && err.transient;
      const isLastAttempt = attempt === GEMINI_MAX_ATTEMPTS;
      if (!transient || isLastAttempt) {
        if (transient && isLastAttempt && attempt > 1) {
          err.message = `${err.message} (gave up after ${attempt} attempts)`;
        }
        throw err;
      }
      const delay = GEMINI_RETRY_BASE_MS * attempt;
      console.warn(`Gemini call failed (attempt ${attempt}/${GEMINI_MAX_ATTEMPTS}): ${err.message}. Retrying in ${delay}ms…`);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA
        }
      })
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      const e = new Error(`Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s.`);
      e.transient = true;
      throw e;
    }
    const e = new Error(`Could not reach the Gemini API: ${err.message}`);
    e.transient = true; // network blip — worth a retry
    throw e;
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const detail = await safeText(res);
    const message = describeGeminiHttpError(res.status, detail);
    const e = new Error(message);
    e.transient = res.status === 429 || res.status >= 500;
    throw e;
  }

  const data = await res.json();

  const finishReason = data?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") {
    throw new Error(`Gemini stopped generating before finishing (finishReason: ${finishReason}).`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content (empty response).");

  return parseJsonLoosely(text);
}

function describeGeminiHttpError(status, detail) {
  const trimmedDetail = (detail || "").slice(0, 500);
  if (status === 400) return `Gemini rejected the request as malformed (400): ${trimmedDetail}`;
  if (status === 401 || status === 403) return `Gemini rejected the API key (${status}). Check that GEMINI_API_KEY is valid and has access to the "${GEMINI_MODEL}" model.`;
  if (status === 404) return `Gemini model "${GEMINI_MODEL}" was not found (404). It may have been renamed or retired — check the current model list in the Gemini API docs.`;
  if (status === 429) return `Gemini API rate limit was exceeded (429): ${trimmedDetail}`;
  if (status >= 500) return `Gemini API server error (${status}): ${trimmedDetail}`;
  return `Gemini API request failed (${status}): ${trimmedDetail}`;
}

async function safeText(res) {
  try { return await res.text(); } catch { return ""; }
}

/** Structured output should already be clean JSON, but this stays
 *  defensive in case a model/config change reintroduces fences or
 *  stray text around the object. */
function parseJsonLoosely(text) {
  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      try {
        return JSON.parse(cleaned.slice(first, last + 1));
      } catch { /* fall through to the original error below */ }
    }
    throw new Error(`Gemini response was not valid JSON: ${err.message}`);
  }
}

/* =========================================================
   VALIDATION
   ========================================================= */
// Dedicated to the shape Gemini must return (a partial article draft,
// not a full articles.json entry — see .github/scripts/validate-articles.mjs
// for that separate, full-schema check). Keeping this here avoids a second
// validator that could disagree with the existing one over a different object.

function validateDraft(draft) {
  const errors = [];
  if (!draft || typeof draft !== "object") errors.push("response is not a JSON object");

  const requireString = (key, { optional = false } = {}) => {
    const val = draft?.[key];
    if (val === undefined && optional) return;
    if (typeof val !== "string" || !val.trim()) errors.push(`"${key}" must be a non-empty string`);
  };

  requireString("title");
  requireString("description");
  requireString("dek");
  requireString("intro");
  requireString("closing");
  requireString("seoTitle");
  requireString("seoDescription");

  if (!Array.isArray(draft?.sections) || draft.sections.length === 0) {
    errors.push('"sections" must be a non-empty array');
  } else {
    draft.sections.forEach((s, i) => {
      if (!s || typeof s !== "object") { errors.push(`sections[${i}] must be an object`); return; }
      if (typeof s.heading !== "string") errors.push(`sections[${i}].heading must be a string`);
      if (!Array.isArray(s.paragraphs) || s.paragraphs.length === 0 || !s.paragraphs.every(p => typeof p === "string" && p.trim())) {
        errors.push(`sections[${i}].paragraphs must be a non-empty array of non-empty strings`);
      }
    });
  }

  if (!Array.isArray(draft?.tags) || !draft.tags.every(t => typeof t === "string")) {
    errors.push('"tags" must be an array of strings');
  }

  if (draft?.bibleVerse !== undefined) {
    const v = draft.bibleVerse;
    const looksEmpty = !v || (typeof v === "object" && !v.text && !v.reference);
    if (v !== null && typeof v !== "object") errors.push('"bibleVerse" must be an object (or omitted)');
    if (looksEmpty) delete draft.bibleVerse; // keep the schema clean — an empty verse is the same as no verse
  }

  if (errors.length) {
    throw new Error(`Gemini response did not match the expected schema: ${errors.join("; ")}`);
  }

  return draft;
}

/* =========================================================
   READ TIME — computed from the generated content itself,
   not guessed by the model (Langkah 18).
   ========================================================= */

const WORDS_PER_MINUTE = 200;

function computeReadTime(article) {
  const text = [
    article.intro,
    ...(article.sections || []).flatMap(s => [s.heading, ...(s.paragraphs || [])]),
    article.closing
  ].filter(Boolean).join(" ");

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

main().catch(err => {
  writeError(err && err.message ? err.message : String(err));
  // Exit 0: the workflow's commit step should still run to publish the
  // error file so the Admin Panel can show it instead of hanging forever.
  process.exit(0);
});
