function inferPageLabel() {
  const fromBody = document.body?.dataset?.pageTitle?.trim();
  if (fromBody) return fromBody;

  const fromTitle = document.title.split("-")[0]?.trim();
  if (fromTitle) return fromTitle;

  const normalized = window.location.pathname.replace(/^\/+|\/+$/g, "");
  const path = normalized.split("/")[0] || "";
  const map = {
    "": "Home",
    "archivio": "Articoli",
    "agenda": "Agenda",
    "agenda-detail": "Agenda",
    "contatti": "Contatti",
    "ricerca": "Ricerca",
    "article": "Articolo",
    "countdown": "Countdown",
    "countdown-detail": "Countdown",
    "admin": "Admin"
  };
  return map[path] || "Pagina";
}

const label = inferPageLabel();
document.querySelectorAll("[data-page-label]").forEach((node) => {
  node.textContent = label;
});
