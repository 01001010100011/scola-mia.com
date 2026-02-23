import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const DOMAIN_FALLBACK = "scola-mia.com";
const INDEX_PRIORITY = "1.0";
const DEFAULT_PRIORITY = "0.7";
const INDEX_CHANGEFREQ = "daily";
const DEFAULT_CHANGEFREQ = "weekly";

const PAGE_RULES = {
  "archivio.html": { changefreq: "daily", priority: "0.9" },
  "article.html": { changefreq: "daily", priority: "0.8" },
  "countdown.html": { changefreq: "daily", priority: "0.8" },
  "countdown-detail.html": { changefreq: "daily", priority: "0.7" },
  "agenda.html": { changefreq: "daily", priority: "0.8" },
  "agenda-detail.html": { changefreq: "daily", priority: "0.7" },
  "contatti.html": { changefreq: "weekly", priority: "0.7" },
  "ricerca.html": { changefreq: "weekly", priority: "0.6" }
};

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

async function resolveDomain() {
  const cnamePath = path.join(ROOT, "CNAME");
  try {
    const value = (await fs.readFile(cnamePath, "utf8")).trim();
    return value || DOMAIN_FALLBACK;
  } catch {
    return DOMAIN_FALLBACK;
  }
}

function isPublicHtmlPage(fileName) {
  if (!fileName.endsWith(".html")) return false;
  if (fileName === "404.html") return false;
  if (/^admin(?:-.*)?\.html$/i.test(fileName)) return false;
  return true;
}

function toUrlPath(fileName) {
  if (fileName === "index.html") return "/";
  return `/${fileName}`;
}

function xmlEscape(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

async function buildSitemap() {
  const domain = await resolveDomain();
  const files = await fs.readdir(ROOT);
  const htmlFiles = files.filter(isPublicHtmlPage).sort();

  const entries = [];
  for (const fileName of htmlFiles) {
    const filePath = path.join(ROOT, fileName);
    const stat = await fs.stat(filePath);
    const lastmod = formatDate(stat.mtime);
    const rule = PAGE_RULES[fileName];
    const loc = `https://${domain}${toUrlPath(fileName)}`;
    const changefreq = fileName === "index.html" ? INDEX_CHANGEFREQ : rule?.changefreq || DEFAULT_CHANGEFREQ;
    const priority = fileName === "index.html" ? INDEX_PRIORITY : rule?.priority || DEFAULT_PRIORITY;

    entries.push(
      `  <url>\n` +
      `    <loc>${xmlEscape(loc)}</loc>\n` +
      `    <lastmod>${lastmod}</lastmod>\n` +
      `    <changefreq>${changefreq}</changefreq>\n` +
      `    <priority>${priority}</priority>\n` +
      `  </url>`
    );
  }

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${entries.join("\n")}\n` +
    `</urlset>\n`
  );
}

async function main() {
  const xml = await buildSitemap();
  await fs.writeFile(path.join(ROOT, "sitemap.xml"), xml, "utf8");
  console.log("sitemap.xml generated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
