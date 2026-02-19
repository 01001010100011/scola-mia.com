import { getPublishedArticles } from "./public-api.js";

const searchInput = document.getElementById("archiveSearchInput");
const allEl = document.getElementById("allArticles");
let publishedArticles = [];

function card(article) {
  return `
    <article class="border-2 border-black bg-white p-4 shadow-brutal">
      ${article.image_url ? `<div class="mb-3 border-2 border-black aspect-[16/9] overflow-hidden"><img src="${article.image_url}" alt="Immagine ${article.title}" class="w-full h-full object-cover" /></div>` : ""}
      <p class="text-xs font-bold uppercase text-accent">${article.category}</p>
      <h3 class="mt-2 text-lg font-semibold">${article.title}</h3>
      <p class="mt-2 text-sm">${article.excerpt}</p>
      <p class="mt-2 text-[11px] uppercase font-bold text-slate-500">Aggiornato: ${new Date(article.updated_at).toLocaleDateString("it-IT")}</p>
      <a href="article.html?id=${encodeURIComponent(article.id)}" class="inline-block mt-3 text-xs font-bold uppercase underline">Leggi</a>
    </article>
  `;
}

function render(query = "") {
  const q = query.trim().toLowerCase();
  const filtered = !q
    ? publishedArticles
    : publishedArticles.filter((article) => `${article.title} ${article.category} ${article.excerpt} ${article.content}`.toLowerCase().includes(q));

  allEl.innerHTML = filtered.length
    ? filtered.map(card).join("")
    : '<div class="md:col-span-3 border-2 border-black bg-white p-4">Nessun articolo trovato per questa ricerca.</div>';
}

async function bootstrap() {
  try {
    publishedArticles = await getPublishedArticles();
  } catch (error) {
    console.error(error);
    allEl.innerHTML = '<div class="md:col-span-3 border-2 border-black bg-white p-4">Errore caricamento articoli.</div>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q") || "";
  searchInput.value = initialQuery;

  document.getElementById("archiveSearchForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const query = searchInput.value.trim();
    const url = query ? `archivio.html?q=${encodeURIComponent(query)}` : "archivio.html";
    history.replaceState(null, "", url);
    render(query);
  });

  searchInput.addEventListener("input", () => render(searchInput.value));
  render(initialQuery);
}

bootstrap();
