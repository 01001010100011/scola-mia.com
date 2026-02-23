import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const DOMAIN_FALLBACK = "scola-mia.com";
const INDEX_PRIORITY = "1.0";
const DEFAULT_PRIORITY = "0.7";
const INDEX_CHANGEFREQ = "daily";
const DEFAULT_CHANGEFREQ = "weekly";

const PAGE_RULES = {
  "archivio": { changefreq: "daily", priority: "0.9" },
  "article": { changefreq: "daily", priority: "0.8" },
  "countdown": { changefreq: "daily", priority: "0.8" },
  "countdown-detail": { changefreq: "daily", priority: "0.7" },
  "agenda": { changefreq: "daily", priority: "0.8" },
  "agenda-detail": { changefreq: "daily", priority: "0.7" },
  "contatti": { changefreq: "weekly", priority: "0.7" },
  "ricerca": { changefreq: "weekly", priority: "0.6" }
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

function publicRouteFolders() {
  return ["archivio", "article", "countdown", "countdown-detail", "agenda", "agenda-detail", "contatti", "ricerca"];
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
  const entries = [];
  const indexStat = await fs.stat(path.join(ROOT, "index.html"));
  entries.push(
    `  <url>\n` +
    `    <loc>${xmlEscape(`https://${domain}/`)}</loc>\n` +
    `    <lastmod>${formatDate(indexStat.mtime)}</lastmod>\n` +
    `    <changefreq>${INDEX_CHANGEFREQ}</changefreq>\n` +
    `    <priority>${INDEX_PRIORITY}</priority>\n` +
    `  </url>`
  );

  for (const route of publicRouteFolders()) {
    const filePath = path.join(ROOT, route, "index.html");
    const stat = await fs.stat(filePath);
    const lastmod = formatDate(stat.mtime);
    const rule = PAGE_RULES[route];
    const loc = `https://${domain}/${route}/`;
    const changefreq = rule?.changefreq || DEFAULT_CHANGEFREQ;
    const priority = rule?.priority || DEFAULT_PRIORITY;

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
