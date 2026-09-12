// Dependency-free validator for Jaziel Article Schema v1.
import { readFileSync } from "node:fs";

const PATH = "articles.json";
const fail = messages => {
  console.error("❌ articles.json failed validation:\n");
  messages.forEach(message => console.error(`  - ${message}`));
  process.exit(1);
};

let data;
try { data = JSON.parse(readFileSync(PATH, "utf8")); }
catch (error) { fail([`Not valid JSON: ${error.message}`]); }
if (!data || !Array.isArray(data.articles)) fail(['Root object must have an "articles" array.']);

const errors = [];
const ids = new Set();
const slugs = new Set();
const required = ["id","title","slug","description","category","date","intro","closing"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const object = value => value && typeof value === "object" && !Array.isArray(value);
const text = value => typeof value === "string" && value.trim().length > 0;

for (const [index, article] of data.articles.entries()) {
  const label = `articles[${index}]`;
  if (!object(article)) { errors.push(`${label}: must be an object`); continue; }

  for (const field of required) if (!text(article[field])) errors.push(`${label}: "${field}" must be a non-empty string`);
  if (typeof article.readTime !== "string") errors.push(`${label}: "readTime" must be a string`);
  if (!slugPattern.test(article.slug || "")) errors.push(`${label}: slug must contain only lowercase letters, numbers and hyphens`);
  if (ids.has(article.id)) errors.push(`${label}: duplicate id "${article.id}"`); ids.add(article.id);
  if (slugs.has(article.slug)) errors.push(`${label}: duplicate slug "${article.slug}"`); slugs.add(article.slug);
  if (Number.isNaN(new Date(article.date).getTime())) errors.push(`${label}: invalid date "${article.date}"`);
  if (article.featured !== undefined && typeof article.featured !== "boolean") errors.push(`${label}: "featured" must be boolean`);
  if (article.views !== undefined && (!Number.isFinite(article.views) || article.views < 0)) errors.push(`${label}: "views" must be a non-negative number`);

  if (!Array.isArray(article.sections) || article.sections.length === 0) errors.push(`${label}: "sections" must be a non-empty array`);
  else article.sections.forEach((section, si) => {
    const path = `${label}.sections[${si}]`;
    if (!object(section)) { errors.push(`${path}: must be an object`); return; }
    if (!text(section.heading)) errors.push(`${path}.heading must be a non-empty string`);
    if (!Array.isArray(section.paragraphs) || section.paragraphs.length === 0 || !section.paragraphs.every(text)) errors.push(`${path}.paragraphs must be a non-empty array of non-empty strings`);
  });

  if (!Array.isArray(article.images)) errors.push(`${label}: "images" must be an array`);
  else article.images.forEach((image, ii) => {
    const path = `${label}.images[${ii}]`;
    if (typeof image === "string") { if (!text(image)) errors.push(`${path}: image path must be non-empty`); return; }
    if (!object(image)) { errors.push(`${path}: must be a string or object`); return; }
    if (!text(image.src)) errors.push(`${path}.src must be a non-empty string`);
    if (image.alt !== undefined && typeof image.alt !== "string") errors.push(`${path}.alt must be a string when present`);
    if (image.caption !== undefined && typeof image.caption !== "string") errors.push(`${path}.caption must be a string when present`);
  });

  if (!Array.isArray(article.tags) || !article.tags.every(text)) errors.push(`${label}: "tags" must be an array of non-empty strings`);
  if (!Array.isArray(article.relatedArticles) || !article.relatedArticles.every(text)) errors.push(`${label}: "relatedArticles" must be an array of non-empty strings`);

  if (article.bibleVerse !== undefined) {
    if (!object(article.bibleVerse)) errors.push(`${label}: "bibleVerse" must be an object`);
    else {
      if (!text(article.bibleVerse.text)) errors.push(`${label}.bibleVerse.text must be a non-empty string`);
      if (!text(article.bibleVerse.reference)) errors.push(`${label}.bibleVerse.reference must be a non-empty string`);
    }
  }

  if (!object(article.seo)) errors.push(`${label}: "seo" must be an object`);
  else {
    if (!text(article.seo.title)) errors.push(`${label}.seo.title must be a non-empty string`);
    if (!text(article.seo.description)) errors.push(`${label}.seo.description must be a non-empty string`);
  }

  if (!object(article.og)) errors.push(`${label}: "og" must be an object`);
  else for (const field of ["title","description","image"]) if (!text(article.og[field])) errors.push(`${label}.og.${field} must be a non-empty string`);
}

if (errors.length) fail(errors);
console.log(`✅ articles.json is valid (${data.articles.length} article(s)); Article Schema v1 unchanged.`);
