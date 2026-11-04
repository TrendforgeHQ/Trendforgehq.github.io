import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { articles } from '../lib/articles';
import { TREND_FORGE_CATEGORIES, categorySlug } from '../lib/categories';

const siteUrl = 'https://trendforgehq.github.io';

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value);
}

type SitemapEntry = {
  url: string;
  lastModified: string;
  frequency: string;
  priority: string;
};

function xmlEntry(item: SitemapEntry) {
  if (!validDate(item.lastModified)) {
    throw new Error(`Invalid sitemap lastmod for ${item.url}: ${item.lastModified}`);
  }
  return [
    '  <url>',
    `    <loc>${escapeXml(item.url)}</loc>`,
    `    <lastmod>${escapeXml(item.lastModified)}</lastmod>`,
    `    <changefreq>${item.frequency}</changefreq>`,
    `    <priority>${item.priority}</priority>`,
    '  </url>',
  ].join('\n');
}

const today = new Date().toISOString().slice(0, 10);
const categories = [...new Set(TREND_FORGE_CATEGORIES.map(categorySlug))];

const entries: SitemapEntry[] = [
  { url: `${siteUrl}/`, lastModified: today, frequency: 'daily', priority: '1.0' },
  { url: `${siteUrl}/search/`, lastModified: today, frequency: 'weekly', priority: '0.6' },
  { url: `${siteUrl}/subscribe/`, lastModified: today, frequency: 'weekly', priority: '0.6' },
  ...categories.map((slug) => ({
    url: `${siteUrl}/category/${slug}/`,
    lastModified: today,
    frequency: 'weekly',
    priority: '0.8',
  })),
  { url: `${siteUrl}/about/`, lastModified: today, frequency: 'monthly', priority: '0.4' },
  { url: `${siteUrl}/privacy/`, lastModified: today, frequency: 'monthly', priority: '0.2' },
  { url: `${siteUrl}/terms/`, lastModified: today, frequency: 'monthly', priority: '0.2' },
  ...articles.map((article) => ({
    url: `${siteUrl}/article/${article.slug}/`,
    lastModified: article.date,
    frequency: 'weekly',
    priority: '0.8',
  })),
];

const urls = entries.map((item) => item.url);
if (new Set(urls).size !== urls.length) {
  throw new Error('Duplicate URL detected in sitemap.');
}
if (urls.some((url) => !url.startsWith(`${siteUrl}/`))) {
  throw new Error('Sitemap contains a URL outside the canonical GitHub Pages site.');
}
if (urls.some((url) => /\s/.test(url))) {
  throw new Error('Sitemap contains a URL with whitespace.');
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(xmlEntry).join('\n')}\n</urlset>\n`;
const textSitemap = `${urls.join('\n')}\n`;
const robots = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\nSitemap: ${siteUrl}/sitemap.txt\n`;

await mkdir('out', { recursive: true });
await writeFile('out/sitemap.xml', sitemap, 'utf8');
await writeFile('out/sitemap.txt', textSitemap, 'utf8');
await writeFile('out/robots.txt', robots, 'utf8');

const writtenSitemap = await readFile('out/sitemap.xml', 'utf8');
const writtenTextSitemap = await readFile('out/sitemap.txt', 'utf8');
const writtenRobots = await readFile('out/robots.txt', 'utf8');

if (!writtenSitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
  throw new Error('Generated sitemap is missing XML declaration.');
}
if (!writtenSitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
  throw new Error('Generated sitemap is missing the sitemap namespace.');
}
if (!writtenSitemap.includes(`<loc>${siteUrl}/</loc>`)) {
  throw new Error('Generated sitemap is missing the canonical homepage.');
}
const writtenTextUrls = writtenTextSitemap.trim().split(/\r?\n/);
if (writtenTextUrls.length !== urls.length || writtenTextUrls.some((url, index) => url !== urls[index])) {
  throw new Error('Generated text sitemap does not exactly match the canonical URL list.');
}
if (writtenTextUrls.some((url) => !url.startsWith(`${siteUrl}/`) || /\s/.test(url))) {
  throw new Error('Generated text sitemap contains an invalid URL.');
}
if (!writtenRobots.includes(`Sitemap: ${siteUrl}/sitemap.xml`) ||
    !writtenRobots.includes(`Sitemap: ${siteUrl}/sitemap.txt`)) {
  throw new Error('robots.txt does not point to both canonical sitemap files.');
}

console.log(`GitHub Pages SEO artifacts written and validated: ${urls.length} URLs in sitemap.xml and sitemap.txt, plus robots.txt`);
