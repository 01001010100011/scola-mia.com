import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SUPABASE_CONFIG_PATH = path.join(ROOT, "assets", "js", "supabase-config.js");
const OUTPUT_DIR = path.join(ROOT, "articoli");
const DOMAIN_FALLBACK = "scola-mia.com";
const DEFAULT_IMAGE = "https://scola-mia.com/assets/social/og-home.png";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function slugifyArticleTitle(title) {
  return String(title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function resolveDomain() {
  try {
    const value = (await fs.readFile(path.join(ROOT, "CNAME"), "utf8")).trim();
    return value || DOMAIN_FALLBACK;
  } catch {
    return DOMAIN_FALLBACK;
  }
}

async function readSupabaseConfig() {
  const source = await fs.readFile(SUPABASE_CONFIG_PATH, "utf8");
  const urlMatch = source.match(/SUPABASE_URL\s*=\s*"([^"]+)"/);
  const keyMatch = source.match(/SUPABASE_ANON_KEY\s*=\s*"([^"]+)"/);
  if (!urlMatch?.[1] || !keyMatch?.[1]) {
    throw new Error("Impossibile leggere SUPABASE_URL/SUPABASE_ANON_KEY da assets/js/supabase-config.js");
  }
  return { url: urlMatch[1], key: keyMatch[1] };
}

async function fetchPublishedArticles({ url, key }) {
  const endpoint = new URL(`${url}/rest/v1/articles`);
  endpoint.searchParams.set("select", "id,title,excerpt,image_url,published,updated_at");
  endpoint.searchParams.set("published", "eq.true");
  endpoint.searchParams.set("order", "updated_at.desc");

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Fetch articoli fallita (${response.status}): ${body}`);
  }

  return response.json();
}

function buildArticleHtml({ title, excerpt, imageUrl, shareUrl, canonicalUrl, redirectUrl }) {
  const safeTitle = escapeHtml(title || "Articolo");
  const safeDescription = escapeHtml(excerpt || "Articolo pubblicato su scola-mia.com");
  const safeImage = escapeHtml(imageUrl || DEFAULT_IMAGE);
  const safeShareUrl = escapeHtml(shareUrl);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeRedirect = escapeHtml(redirectUrl);

  return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle} - scola-mia.com</title>
  <link rel="icon" type="image/svg+xml" href="/assets/favicon-scola-mia.svg" />
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="Scola-Mia.com" />
  <meta property="og:locale" content="it_IT" />
  <meta property="og:url" content="${safeShareUrl}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:image" content="${safeImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f4f3ee; color: #101010; font-family: "IBM Plex Sans", sans-serif; }
    .wrap { padding: 24px; text-align: center; }
    a { color: #0c7ff2; font-weight: 700; }
  </style>
</head>
<body data-article-id="${escapeHtml(redirectUrl.split("id=")[1]?.split("&")[0] || "")}">
  <div class="wrap">
    <p>Sto aprendo l'articolo...</p>
    <p><a href="${safeRedirect}">Apri articolo</a></p>
  </div>
  <script>
    window.location.replace(${JSON.stringify(redirectUrl)});
  </script>
</body>
</html>
`;
}

async function main() {
  const domain = await resolveDomain();
  const supabase = await readSupabaseConfig();
  const articles = await fetchPublishedArticles(supabase);

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  for (const article of articles) {
    const slug = slugifyArticleTitle(article.title);
    const folderName = `${article.id}${slug ? `-${slug}` : ""}`;
    const folderPath = path.join(OUTPUT_DIR, folderName);
    const shareUrl = `https://${domain}/articoli/${folderName}/`;
    const redirectUrl = `/article/?id=${encodeURIComponent(article.id)}${slug ? `&slug=${encodeURIComponent(slug)}` : ""}`;

    await fs.mkdir(folderPath, { recursive: true });
    await fs.writeFile(
      path.join(folderPath, "index.html"),
      buildArticleHtml({
        title: article.title,
        excerpt: article.excerpt,
        imageUrl: article.image_url,
        shareUrl,
        canonicalUrl: shareUrl,
        redirectUrl
      }),
      "utf8"
    );
  }

  console.log(`Article share pages generated: ${articles.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

