import { getAgendaEventById } from "./public-api.js?v=20260224e";
import { escapeHtml, formatLocalDate } from "./supabase-client.js?v=20260224e";

const container = document.getElementById("agendaEventContainer");

function renderEvent(eventItem) {
  const dateLabel = formatLocalDate(eventItem.date) || "Data non valida";
  container.innerHTML = `
    <p class="text-xs uppercase font-bold text-accent">${escapeHtml(eventItem.category || "Evento")}</p>
    <h1 class="headline text-6xl mt-2">${escapeHtml(eventItem.title || "Evento agenda")}</h1>
    <p class="mt-3 text-[11px] uppercase font-bold text-slate-500">${dateLabel}</p>
    <div class="mt-8 pt-6 border-t-2 border-black prose max-w-none prose-p:leading-7">
      <p>${escapeHtml(eventItem.description || "Nessuna descrizione disponibile.").replaceAll("\n", "<br>")}</p>
    </div>
  `;
}

async function bootstrap() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    container.innerHTML = '<p class="text-lg font-semibold">Evento non trovato.</p>';
    return;
  }

  try {
    const eventItem = await getAgendaEventById(id);
    if (!eventItem) {
      container.innerHTML = '<p class="text-lg font-semibold">Evento non disponibile.</p>';
      return;
    }
    renderEvent(eventItem);
  } catch (error) {
    console.error(error);
    container.innerHTML = '<p class="text-lg font-semibold">Errore caricamento evento.</p>';
  }
}

bootstrap();
