import { promises as fs } from "node:fs";
import path from "node:path";
import { readSupabaseConfig, resolveDomain } from "./lib/site-config.mjs";

const ROOT = process.cwd();

const STATIC_ROUTES = [
  { route: "archivio", changefreq: "daily", priority: "0.9" },
  { route: "agenda", changefreq: "daily", priority: "0.8" },
  { route: "contatti", changefreq: "weekly", priority: "0.7" },
  { route: "countdown", changefreq: "daily", priority: "0.8" },
  { route: "cookie", changefreq: "monthly", priority: "0.5" },
  { route: "turni-ricreazione", changefreq: "weekly", priority: "0.7" },
  { route: "ricerca", changefreq: "weekly", priority: "0.6" }
];

function slugifyText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildUniqueSlugMap(items, getId, getTitle) {
  const counts = new Map();
  const out = new Map();
  const sorted = [...items].sort((a, b) => {
    const aTime = new Date(a?.created_at || a?.updated_at || 0).getTime() || 0;
    const bTime = new Date(b?.created_at || b?.updated_at || 0).getTime() || 0;
    if (aTime !== bTime) return aTime - bTime;
    return String(getId(a) || "").localeCompare(String(getId(b) || ""));
  });

  for (const item of sorted) {
    const id = String(getId(item) || "").trim();
    if (!id) continue;
    const base = slugifyText(getTitle(item)) || "contenuto";
    const next = (counts.get(base) || 0) + 1;
    counts.set(base, next);
    out.set(id, next === 1 ? base : `${base}-${next}`);
  }

  return out;
}

function isNoindexArticleSlug(slug) {
  return /\b(prova|test|preview)\b/i.test(String(slug || ""));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function xmlEscape(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function fetchRows({ url, key }, table, select, params = {}) {
  const endpoint = new URL(`${url}/rest/v1/${table}`);
  endpoint.searchParams.set("select", select);
  for (const [k, v] of Object.entries(params)) endpoint.searchParams.set(k, v);

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetch ${table} fallita (${response.status}): ${body}`);
  }

  return response.json();
}

function xmlEntry(loc, lastmod, changefreq, priority) {
  return (
    `  <url>\n` +
    `    <loc>${xmlEscape(loc)}</loc>\n` +
    `    <lastmod>${lastmod}</lastmod>\n` +
    `    <changefreq>${changefreq}</changefreq>\n` +
    `    <priority>${priority}</priority>\n` +
    `  </url>`
  );
}

async function buildSitemap() {
  const domain = await resolveDomain();
  const supabase = await readSupabaseConfig();
  const entries = [];
  const seen = new Set();

  const pushEntry = (url, lastmod, changefreq, priority) => {
    if (seen.has(url)) return;
    seen.add(url);
    entries.push(xmlEntry(url, lastmod, changefreq, priority));
  };

  const articles = await fetchRows(
    supabase,
    "articles",
    "id,title,created_at,updated_at",
    { published: "eq.true", order: "updated_at.desc" }
  );

  // lastmod basato sul contenuto, non sull'mtime dei file: su CI il checkout
  // imposta mtime=adesso, quindi usare fs.stat faceva cambiare il sitemap a
  // ogni run (churn di commit ogni 30 minuti). La data del contenuto è stabile
  // e cambia solo quando un articolo viene davvero aggiornato.
  const contentLastmod = (() => {
    let latest = 0;
    for (const article of articles || []) {
      const t = new Date(article.updated_at || article.created_at || 0).getTime() || 0;
      if (t > latest) latest = t;
    }
    return formatDate(latest ? new Date(latest) : new Date());
  })();

  pushEntry(`https://${domain}/`, contentLastmod, "daily", "1.0");

  for (const item of STATIC_ROUTES) {
    pushEntry(`https://${domain}/${item.route}/`, contentLastmod, item.changefreq, item.priority);
  }

  const articleSlugMap = buildUniqueSlugMap(articles || [], (x) => x.id, (x) => x.title);
  for (const article of articles || []) {
    const slug = articleSlugMap.get(String(article.id || ""));
    if (!slug || isNoindexArticleSlug(slug)) continue;
    const lastmod = formatDate(new Date(article.updated_at || article.created_at || Date.now()));
    pushEntry(`https://${domain}/articoli/${slug}/`, lastmod, "weekly", "0.7");
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
