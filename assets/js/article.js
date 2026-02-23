import { getArticleById } from "./public-api.js";
import { escapeHtml, formatLocalDate, supabase } from "./supabase-client.js";
import { slugifyArticleTitle } from "./article-url.js";

const container = document.getElementById("articleContainer");

async function isAuthenticated() {
  const { data } = await supabase.auth.getSession();
  return Boolean(data?.session);
}

function renderArticle(article) {
  const safeText = escapeHtml(article.content).replaceAll("\n", "<br>");
  const attachments = Array.isArray(article.attachments) ? article.attachments : [];
  const publishedAt = article.created_at || article.updated_at;
  const publishedLabel = formatLocalDate(publishedAt);

  container.innerHTML = `
    <p class="text-xs uppercase font-bold text-accent">${escapeHtml(article.category)}</p>
    <h1 class="headline text-6xl mt-2">${escapeHtml(article.title)}</h1>
    ${publishedLabel ? `<p class="mt-2 text-[11px] uppercase font-bold text-slate-500">Pubblicato il ${publishedLabel}</p>` : ""}
    ${article.image_url ? `<div class="mt-6 border-2 border-black aspect-[16/9] overflow-hidden"><img src="${article.image_url}" alt="${escapeHtml(article.title)}" class="w-full h-full object-cover" /></div>` : ""}
    <div class="mt-8 pt-6 border-t-2 border-black prose max-w-none prose-p:leading-7">
      <p>${safeText}</p>
    </div>
    ${attachments.length ? `
      <section class="mt-8 pt-6 border-t-2 border-black">
        <h2 class="headline text-4xl">Allegati</h2>
        <div class="mt-3 space-y-2">
          ${attachments.map((item) => `
            <a href="${item.url}" download="${escapeHtml(item.name || "allegato")}" class="block border-2 border-black p-3 font-semibold underline">
              ${escapeHtml(item.name || "Allegato")}
            </a>
          `).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

async function bootstrap() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    container.innerHTML = '<p class="text-lg font-semibold">Articolo non trovato.</p>';
    return;
  }

  try {
    const allowDraft = await isAuthenticated();
    const article = await getArticleById(id, allowDraft);

    if (!article) {
      container.innerHTML = '<p class="text-lg font-semibold">Articolo non disponibile.</p>';
      return;
    }

    const expectedSlug = slugifyArticleTitle(article.title);
    if (expectedSlug && params.get("slug") !== expectedSlug) {
      params.set("slug", expectedSlug);
      history.replaceState(null, "", `/article/?${params.toString()}`);
    }

    renderArticle(article);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="text-lg font-semibold">Errore caricamento articolo.</p>';
  }
}

bootstrap();
