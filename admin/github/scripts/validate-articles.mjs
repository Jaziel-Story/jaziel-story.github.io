// Validates articles.json against the schema Jaziel's frontend
// (assets/js/main.js) and Admin Panel (admin/admin.js) both expect.
// Deliberately dependency-free (no ajv) so CI never needs `npm install`.

import { readFileSync } from "node:fs";

const PATH = "articles.json";

function fail(messages) {
  console.error("❌ articles.json failed validation:\n");
  messages.forEach(m => console.error(`  - ${m}`));
  process.exit(1);
}

let raw;
try {
  raw = readFileSync(PATH, "utf8");
} catch (err) {
  fail([`Could not read ${PATH}: ${err.message}`]);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  fail([`Not valid JSON: ${err.message}`]);
}

if (!data || !Array.isArray(data.articles)) {
  fail(['Root object must have an "articles" array.']);
}

const errors = [];
const seenIds = new Set();
const seenSlugs = new Set();

const REQUIRED_STRING_FIELDS = ["id", "title", "slug", "description", "category", "date", "intro"];
const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;

data.articles.forEach((article, index) => {
  const label = `articles[${index}] (${article && article.slug ? article.slug : "no slug"})`;

  if (!article || typeof article !== "object") {
    errors.push(`${label}: not an object`);
    return;
  }

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof article[field] !== "string" || !article[field].trim()) {
      errors.push(`${label}: missing or empty required field "${field}"`);
    }
  }

  if (typeof article.slug === "string") {
    if (!slugPattern.test(article.slug)) {
      errors.push(`${label}: slug "${article.slug}" must be lowercase letters, numbers and hyphens only`);
    }
    if (seenSlugs.has(article.slug)) {
      errors.push(`${label}: duplicate slug "${article.slug}"`);
    }
    seenSlugs.add(article.slug);
  }

  if (typeof article.id === "string") {
    if (seenIds.has(article.id)) errors.push(`${label}: duplicate id "${article.id}"`);
    seenIds.add(article.id);
  }

  if (article.date && Number.isNaN(new Date(article.date).getTime())) {
    errors.push(`${label}: invalid date "${article.date}"`);
  }

  if (article.sections !== undefined) {
    if (!Array.isArray(article.sections)) {
      errors.push(`${label}: "sections" must be an array`);
    } else {
      article.sections.forEach((s, si) => {
        if (s.paragraphs !== undefined && !Array.isArray(s.paragraphs)) {
          errors.push(`${label}: sections[${si}].paragraphs must be an array`);
        }
      });
    }
  }

  if (article.images !== undefined && !Array.isArray(article.images)) {
    errors.push(`${label}: "images" must be an array`);
  }

  if (article.tags !== undefined && !Array.isArray(article.tags)) {
    errors.push(`${label}: "tags" must be an array`);
  }

  if (article.relatedArticles !== undefined && !Array.isArray(article.relatedArticles)) {
    errors.push(`${label}: "relatedArticles" must be an array`);
  }

  if (article.seo !== undefined && typeof article.seo !== "object") {
    errors.push(`${label}: "seo" must be an object`);
  }

  if (article.og !== undefined && typeof article.og !== "object") {
    errors.push(`${label}: "og" must be an object`);
  }
});

if (errors.length) fail(errors);

console.log(`✅ articles.json is valid (${data.articles.length} article(s)).`);
