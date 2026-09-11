// Runs inside GitHub Actions only. Reads a request file the Admin Panel
// committed to admin/ai-requests/<id>.json, calls Gemini using the
// GEMINI_API_KEY secret, and writes the structured draft result.

import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "node:fs";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 55_000;
const GEMINI_MAX_ATTEMPTS = 3;
const GEMINI_RETRY_BASE_MS = 2_000;

const requestId = process.env.REQUEST_ID;
const apiKey = process.env.GEMINI_API_KEY;
const REQUEST_PATH = `admin/ai-requests/${requestId}.json`;
const RESULT_PATH = `admin/ai-results/${requestId}.json`;
const ERROR_PATH = `admin/ai-results/${requestId}.error.json`;

mkdirSync("admin/ai-results", { recursive: true });

function writeError(message) {
  writeFileSync(ERROR_PATH, JSON.stringify({ message: String(message), at: new Date().toISOString() }, null, 2) + "\n");
  console.error("AI Writer error:", message);
}

async function main() {
  if (!requestId) throw new Error("No request_id was provided to the workflow.");
  if (!apiKey) throw new Error("GEMINI_API_KEY secret is not configured on this repository.");
  if (!existsSync(REQUEST_PATH)) throw new Error(`Request file ${REQUEST_PATH} was not found.`);

  const request = JSON.parse(readFileSync(REQUEST_PATH, "utf8"));
  const { rawText, titleHint, categoryHint, instructions } = request;
  if (!rawText || !rawText.trim()) throw new Error("Request had no raw article text.");
  if (!categoryHint || !categoryHint.trim()) throw new Error("Category is required before AI Writer can generate an article.");

  const prompt = buildPrompt({ rawText, titleHint, categoryHint, instructions });
  const draft = await callGeminiWithRetry(prompt);
  const validated = validateDraft(draft, categoryHint);
  const article = { ...validated, readTime: computeReadTime(validated) };

  writeFileSync(RESULT_PATH, JSON.stringify(article, null, 2) + "\n");
  try { rmSync(REQUEST_PATH); } catch { /* non-fatal */ }
}

function buildPrompt({ rawText, titleHint, categoryHint, instructions }) {
  return `You are a news rewriting assistant for a trending-stories site called Jaziel.
Rewrite the raw article text below into the site's article format.

Rules:
- Do not invent facts, quotes, statistics, or sources that are not present in the raw article text.
- Keep the tone natural, readable, and engaging for a mobile-friendly trending-stories site.
- The category is mandatory and MUST be exactly: ${categoryHint.trim()}
- Do not invent a different category.
- Only include bibleVerse when genuinely warranted by the source or explicit instructions.
- Respond with ONLY one JSON object.

Required JSON shape:
{
  "title": string,
  "category": string,
  "description": string,
  "dek": string,
  "intro": string,
  "sections": [{ "heading": string, "paragraphs": [string, ...] }],
  "closing": string,
  "tags": [string, ...],
  "seoTitle": string,
  "seoDescription": string,
  "bibleVerse": { "text": string, "reference": string }
}
Omit bibleVerse unless warranted.

${titleHint ? `Suggested title direction: ${titleHint}` : ""}
${instructions ? `Additional instructions from the editor: ${instructions}` : ""}

Raw article text:
"""
${rawText}
"""`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    category: { type: "string" },
    description: { type: "string" },
    dek: { type: "string" },
    intro: { type: "string" },
    sections: { type: "array", items: { type: "object", properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } }, required: ["heading", "paragraphs"] } },
    closing: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    seoTitle: { type: "string" },
    seoDescription: { type: "string" },
    bibleVerse: { type: "object", properties: { text: { type: "string" }, reference: { type: "string" } } }
  },
  required: ["title", "category", "description", "dek", "intro", "sections", "closing", "tags", "seoTitle", "seoDescription"]
};

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function callGeminiWithRetry(prompt) {
  let lastErr;
  for (let attempt = 1; attempt <= GEMINI_MAX_ATTEMPTS; attempt++) {
    try { return await callGemini(prompt); }
    catch (err) {
      lastErr = err;
      if (!err?.transient || attempt === GEMINI_MAX_ATTEMPTS) throw err;
      await sleep(GEMINI_RETRY_BASE_MS * attempt);
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
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.6, responseMimeType: "application/json", responseSchema: RESPONSE_SCHEMA } }) });
  } catch (err) {
    const e = new Error(err.name === "AbortError" ? `Gemini request timed out after ${GEMINI_TIMEOUT_MS / 1000}s.` : `Could not reach the Gemini API: ${err.message}`);
    e.transient = true; throw e;
  } finally { clearTimeout(timeout); }

  if (!res.ok) {
    const detail = (await safeText(res)).slice(0, 500);
    const e = new Error(`Gemini API request failed (${res.status}): ${detail}`);
    e.transient = res.status === 429 || res.status >= 500; throw e;
  }
  const data = await res.json();
  const finishReason = data?.candidates?.[0]?.finishReason;
  if (finishReason && finishReason !== "STOP") throw new Error(`Gemini stopped generating before finishing (finishReason: ${finishReason}).`);
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content (empty response).");
  return parseJsonLoosely(text);
}

async function safeText(res) { try { return await res.text(); } catch { return ""; } }
function parseJsonLoosely(text) {
  const cleaned = text.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(cleaned); } catch (err) {
    const first = cleaned.indexOf("{"), last = cleaned.lastIndexOf("}");
    if (first !== -1 && last > first) { try { return JSON.parse(cleaned.slice(first, last + 1)); } catch {} }
    throw new Error(`Gemini response was not valid JSON: ${err.message}`);
  }
}

function validateDraft(draft, expectedCategory) {
  const errors = [];
  const requireString = (key) => { if (typeof draft?.[key] !== "string" || !draft[key].trim()) errors.push(`"${key}" must be a non-empty string`); };
  ["title", "category", "description", "dek", "intro", "closing", "seoTitle", "seoDescription"].forEach(requireString);
  if (draft?.category?.trim() !== expectedCategory.trim()) errors.push(`"category" must exactly match the Category Hint "${expectedCategory.trim()}"`);
  if (!Array.isArray(draft?.sections) || !draft.sections.length) errors.push('"sections" must be a non-empty array');
  else draft.sections.forEach((s, i) => { if (!s || typeof s !== "object") errors.push(`sections[${i}] must be an object`); else { if (typeof s.heading !== "string" || !s.heading.trim()) errors.push(`sections[${i}].heading must be non-empty`); if (!Array.isArray(s.paragraphs) || !s.paragraphs.length || !s.paragraphs.every(p => typeof p === "string" && p.trim())) errors.push(`sections[${i}].paragraphs must contain non-empty strings`); } });
  if (!Array.isArray(draft?.tags) || !draft.tags.every(t => typeof t === "string" && t.trim())) errors.push('"tags" must be an array of non-empty strings');
  if (draft?.bibleVerse !== undefined && draft.bibleVerse !== null && typeof draft.bibleVerse !== "object") errors.push('"bibleVerse" must be an object or omitted');
  if (errors.length) throw new Error(`Gemini response did not match the expected schema: ${errors.join("; ")}`);
  return draft;
}

function computeReadTime(article) {
  const text = [article.intro, ...(article.sections || []).flatMap(s => [s.heading, ...(s.paragraphs || [])]), article.closing].filter(Boolean).join(" ");
  return `${Math.max(1, Math.round(text.trim().split(/\s+/).filter(Boolean).length / 200))} min read`;
}

main().catch(err => { writeError(err?.message || String(err)); process.exit(0); });
