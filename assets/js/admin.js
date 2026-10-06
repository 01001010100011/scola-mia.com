import { escapeHtml, formatLocalDate, supabase, toSlugSafeName } from "./supabase-client.js?v=20260224e";
import { buildAgendaSlugMap, getAgendaSlug } from "./agenda-url.js?v=20260303a";
import { buildCountdownUrl } from "./countdown-url.js?v=20260303a";
import { buildArticleSlugMap, getArticleSlug } from "./article-url.js?v=20260303c";
import { ensureSiteSettingsRow, saveSiteSettings } from "./site-settings.js?v=20260312a";
import { ensureCurrentUserIsAdmin } from "./admin-auth.js?v=20261006a";
import { confirmDialog, showToast } from "./admin-ui.js?v=20261006a";
import { normalizeAllArticleImages } from "./admin-photo-tools.js?v=20261006a";

const REQUIRE_LOGIN_ON_EACH_VISIT = false;

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "articles", label: "Articoli" },
  { id: "countdown", label: "Countdown" },
  { id: "agenda", label: "Agenda" },
  { id: "settings", label: "Impostazioni" }
];

const loginBox = document.getElementById("loginBox");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const adminStatus = document.getElementById("adminStatus");

const articlesView = document.getElementById("articlesView");
const featuredView = document.getElementById("featuredView");
const openArticlesViewBtn = document.getElementById("openArticlesViewBtn");
const openFeaturedViewBtn = document.getElementById("openFeaturedViewBtn");
const newArticleBtn = document.getElementById("newArticleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const logoutBtnDesktop = document.getElementById("logoutBtnDesktop");
const maintenanceActiveBanner = document.getElementById("maintenanceActiveBanner");
const maintenanceModeInput = document.getElementById("maintenanceModeInput");
const maintenanceModeSaveBtn = document.getElementById("maintenanceModeSaveBtn");
const maintenanceModeHint = document.getElementById("maintenanceModeHint");
const normalizePhotosBtn = document.getElementById("normalizePhotosBtn");
const normalizePhotosProgress = document.getElementById("normalizePhotosProgress");
const settingsAccountEmail = document.getElementById("settingsAccountEmail");

const adminArticlesOnline = document.getElementById("adminArticlesOnline");
const adminArticlesDrafts = document.getElementById("adminArticlesDrafts");
const featuredManagerList = document.getElementById("featuredManagerList");

const adminCountdowns = document.getElementById("adminCountdowns");
const newCountdownBtn = document.getElementById("newCountdownBtn");
const countdownForm = document.getElementById("countdownForm");
const countdownSlugPreview = document.getElementById("countdownSlugPreview");

const adminAgendaEvents = document.getElementById("adminAgendaEvents");
const newAgendaBtn = document.getElementById("newAgendaBtn");
const agendaForm = document.getElementById("agendaForm");
const agendaSlugPreview = document.getElementById("agendaSlugPreview");

const slideoverRoot = document.getElementById("slideoverRoot");
const slideoverPanel = document.getElementById("slideoverPanel");
const slideoverTitle = document.getElementById("slideoverTitle");
const slideoverMeta = document.getElementById("slideoverMeta");
const slideoverSaveBtn = document.getElementById("slideoverSaveBtn");
const slideoverCancelBtn = document.getElementById("slideoverCancelBtn");
const slideoverCloseBtn = document.getElementById("slideoverCloseBtn");
const slideoverBackdrop = document.getElementById("slideoverBackdrop");

const statArticlesOnline = document.getElementById("statArticlesOnline");
const statArticlesDrafts = document.getElementById("statArticlesDrafts");
const statCountdownsActive = document.getElementById("statCountdownsActive");
const statAgendaEvents = document.getElementById("statAgendaEvents");

let currentView = "dashboard";
let currentArticleSubView = "articles";
let draggedFeaturedId = null;
let slideoverKind = null;
let isSlideoverSaving = false;

let articles = [];
let countdowns = [];
let events = [];
let featuredIds = [];
let siteSettings = { id: 1, featuredArticleIds: [], maintenanceMode: false };

let activeContext = null;

function setLoginError(message = "") {
  if (!message) {
    loginError.classList.add("hidden");
    return;
  }
  loginError.textContent = message;
  loginError.classList.remove("hidden");
}

function setAdminStatus(message = "") {
  if (!message) {
    adminStatus.classList.add("hidden");
    adminStatus.textContent = "";
    return;
  }
  adminStatus.textContent = message;
  adminStatus.classList.remove("hidden");
}

function authErrorMessage(error) {
  const raw = (error?.message || "").toLowerCase();
  if (raw.includes("email not confirmed")) return "Email non confermata. Conferma la mail dell'admin in Supabase Auth.";
  if (raw.includes("invalid login credentials")) return "Credenziali non valide.";
  if (raw.includes("network")) return "Errore di rete. Controlla connessione e riprova.";
  if (raw.includes("captcha")) return "Richiesta bloccata dal controllo di sicurezza (captcha).";
  return error?.message || "Errore durante l'accesso.";
}

function normalizeAgendaDateInput(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  if (iso) return iso[1];
  const dmy = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return "";
}

function agendaSortValue(value) {
  const normalized = normalizeAgendaDateInput(value);
  if (!normalized) return Number.POSITIVE_INFINITY;
  const time = new Date(`${normalized}T00:00:00`).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function countdownSortValue(value) {
  const time = new Date(value || "").getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

function normalizeCountdownEmoji(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return Array.from(trimmed).slice(0, 2).join("");
}

function isoToDateTimeLocal(value) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function dateTimeLocalToIso(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function countdownSlug(title, targetAt, existing = "") {
  if (existing) return existing;
  const base = toSlugSafeName(title || "countdown").replace(/^-+|-+$/g, "") || "countdown";
  const used = new Set((countdowns || []).map((item) => String(item.slug || "").trim()).filter(Boolean));
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function renderCountdownSlugPreview() {
  if (!countdownSlugPreview) return;
  const id = String(document.getElementById("countdownId").value || "").trim();
  const title = String(document.getElementById("countdownTitle").value || "").trim();
  const existing = countdowns.find((item) => item.id === id);
  const slug = countdownSlug(title || "countdown", "", existing?.slug);
  const previewEvent = { slug };
  countdownSlugPreview.textContent = `${window.location.origin}${buildCountdownUrl(previewEvent)}`;
}

function renderAgendaSlugPreview() {
  if (!agendaSlugPreview) return;
  const id = String(document.getElementById("agendaEventId").value || "").trim() || "__agenda-preview__";
  const title = String(document.getElementById("agendaTitle").value || "").trim();
  if (!title) {
    agendaSlugPreview.textContent = `${window.location.origin}/agenda/{slug}/`;
    return;
  }

  const working = Array.isArray(events) ? [...events] : [];
  const idx = working.findIndex((item) => String(item?.id || "") === id);
  if (idx >= 0) {
    working[idx] = { ...working[idx], title };
  } else {
    working.push({ id, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  }
  const slugMap = buildAgendaSlugMap(working);
  const slug = getAgendaSlug({ id, title }, slugMap);
  agendaSlugPreview.textContent = `${window.location.origin}/agenda/${slug}/`;
}

function getArticleUrl(article) {
  const slugMap = buildArticleSlugMap(articles);
  return `/articoli/${getArticleSlug(article, slugMap)}/`;
}

function sanitizeFeaturedIds() {
  const valid = new Set(articles.filter((item) => item.published).map((item) => item.id));
  featuredIds = featuredIds.filter((id) => valid.has(id));
}

function getAutoFeaturedIds() {
  return articles
    .filter((item) => item.published)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .map((item) => item.id)
    .slice(0, 3);
}

function getEffectiveFeaturedIds() {
  return featuredIds.length ? [...featuredIds] : getAutoFeaturedIds();
}

async function upsertFeaturedIds() {
  siteSettings = await saveSiteSettings({ featuredArticleIds: featuredIds });
}

async function loadData() {
  const [
    { data: articleData, error: articleError },
    { data: countdownData, error: countdownError },
    { data: eventData, error: eventError },
    settings
  ] = await Promise.all([
    supabase
      .from("articles")
      .select("id,title,category,excerpt,published,created_at,updated_at")
      .order("updated_at", { ascending: false }),
    supabase
      .from("countdowns")
      .select("id,slug,title,emoji,target_at,is_featured,active,created_at,updated_at")
      .order("is_featured", { ascending: false })
      .order("target_at", { ascending: true }),
    supabase
      .from("agenda_events")
      .select("id,title,category,date,description,created_at,updated_at")
      .order("updated_at", { ascending: false }),
    ensureSiteSettingsRow()
  ]);

  if (articleError) throw articleError;
  if (countdownError) throw countdownError;
  if (eventError) throw eventError;

  articles = articleData || [];
  countdowns = countdownData || [];
  events = (eventData || []).sort((a, b) => agendaSortValue(a.date) - agendaSortValue(b.date));
  siteSettings = settings;
  featuredIds = [...siteSettings.featuredArticleIds];
  sanitizeFeaturedIds();
}

function renderStats() {
  if (!statArticlesOnline) return;
  statArticlesOnline.textContent = String(articles.filter((item) => item.published).length);
  statArticlesDrafts.textContent = String(articles.filter((item) => !item.published).length);
  statCountdownsActive.textContent = String(countdowns.filter((item) => item.active).length);
  statAgendaEvents.textContent = String(events.length);
}

function renderMaintenanceUi() {
  if (maintenanceModeInput) {
    maintenanceModeInput.checked = Boolean(siteSettings.maintenanceMode);
  }

  if (maintenanceModeHint) {
    maintenanceModeHint.textContent = siteSettings.maintenanceMode
      ? "Il sito pubblico e bloccato e reindirizzato a /manutenzione. Admin, sitemap e canale WhatsApp restano raggiungibili."
      : "Quando attivi la manutenzione, quasi tutto il sito pubblico viene bloccato. L'area admin resta pienamente accessibile.";
  }

  if (maintenanceActiveBanner) {
    maintenanceActiveBanner.classList.toggle("hidden", !siteSettings.maintenanceMode);
  }
}

function articleRow(article) {
  const statusLabel = article.published ? "Online" : "Bozza";
  const statusClass = article.published ? "text-emerald-700" : "text-amber-700";
  const viewLink = article.published
    ? `<a href="${getArticleUrl(article)}" target="_blank" rel="noopener" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase">Vedi</a>`
    : "";
  return `
    <article class="border-2 border-black p-4">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p class="text-xs uppercase font-bold text-accent">${escapeHtml(article.category || "Senza categoria")}</p>
          <h4 class="text-lg font-semibold">${escapeHtml(article.title)}</h4>
          <p class="text-xs mt-2">Ultimo aggiornamento: ${new Date(article.updated_at).toLocaleString("it-IT")} | Stato: <span class="font-bold ${statusClass}">${statusLabel}</span></p>
        </div>
        <div class="flex flex-wrap gap-2 md:justify-end">
          <a href="/admin-article-editor/?id=${encodeURIComponent(article.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase">Modifica</a>
          ${viewLink}
          <button data-article-action="toggle" data-id="${escapeHtml(article.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase">${article.published ? "Sposta in bozze" : "Pubblica"}</button>
          <button data-article-action="delete" data-id="${escapeHtml(article.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase text-red-700">Elimina</button>
        </div>
      </div>
    </article>
  `;
}

function renderAdminArticles() {
  const online = articles.filter((item) => item.published);
  const drafts = articles.filter((item) => !item.published);

  adminArticlesOnline.innerHTML = online.length
    ? online.map(articleRow).join("")
    : '<p class="text-sm">Nessun articolo online.</p>';

  adminArticlesDrafts.innerHTML = drafts.length
    ? drafts.map(articleRow).join("")
    : '<p class="text-sm">Nessuna bozza presente.</p>';
}

function renderFeaturedManager() {
  const published = articles.filter((item) => item.published);
  const effectiveFeaturedIds = getEffectiveFeaturedIds();
  const usingAutoFallback = featuredIds.length === 0;

  if (!published.length) {
    featuredManagerList.innerHTML = '<p class="text-sm">Non ci sono articoli pubblicati da mettere in evidenza.</p>';
    return;
  }

  const featuredSet = new Set(effectiveFeaturedIds);
  const featuredArticles = effectiveFeaturedIds.map((id) => published.find((item) => item.id === id)).filter(Boolean);

  const orderHtml = featuredArticles.length
    ? featuredArticles.map((article, index) => `
      <article draggable="true" data-drag-id="${escapeHtml(article.id)}" class="border-2 border-black bg-yellow-100 p-3 cursor-move">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs uppercase font-bold text-accent">${escapeHtml(article.category)}</p>
            <h4 class="font-semibold">${escapeHtml(article.title)}</h4>
            <p class="text-xs mt-1 text-amber-700">★ In evidenza #${index + 1}${usingAutoFallback ? " (auto recenti)" : ""}</p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" data-feature-action="move-up" data-id="${escapeHtml(article.id)}" class="border-2 border-black bg-white px-2 py-1 text-[10px] font-bold uppercase" aria-label="Sposta su"${index === 0 ? " disabled" : ""}>↑</button>
            <button type="button" data-feature-action="move-down" data-id="${escapeHtml(article.id)}" class="border-2 border-black bg-white px-2 py-1 text-[10px] font-bold uppercase" aria-label="Sposta giu"${index === featuredArticles.length - 1 ? " disabled" : ""}>↓</button>
            <button data-feature-action="remove" data-id="${escapeHtml(article.id)}" class="border-2 border-black bg-white px-2 py-1 text-[10px] font-bold uppercase">Rimuovi</button>
          </div>
        </div>
      </article>
    `).join("")
    : '<p class="text-sm">Nessun articolo selezionato.</p>';

  const allHtml = published.map((article) => {
    const selected = featuredSet.has(article.id);
    return `
      <article class="border-2 border-black p-3 ${selected ? "bg-yellow-100" : "bg-white"}">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0">
            <p class="text-xs uppercase font-bold text-accent">${escapeHtml(article.category)}</p>
            <h4 class="font-semibold">${escapeHtml(article.title)}</h4>
            <p class="text-xs mt-1 ${selected ? "text-amber-700 font-semibold" : "text-slate-500"}">${selected ? "★ Già in evidenza" : "○ Non in evidenza"}</p>
          </div>
          <button data-feature-action="${selected ? "remove" : "add"}" data-id="${escapeHtml(article.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase ${selected ? "bg-white" : "bg-accent text-white"}">${selected ? "Rimuovi" : "Aggiungi"}</button>
        </div>
      </article>
    `;
  }).join("");

  featuredManagerList.innerHTML = `
    <div class="grid lg:grid-cols-2 gap-4">
      <section class="border-2 border-black p-4">
        <h4 class="text-xs font-bold uppercase mb-2">Ordine in evidenza (drag &amp; drop)</h4>
        <p class="text-[11px] text-slate-600 mb-2">${usingAutoFallback ? "Nessuna evidenza manuale salvata: qui vedi il fallback automatico dei 3 articoli piu recenti." : "Stai gestendo l'ordine manuale degli articoli in evidenza."}</p>
        <div id="featuredOrderList" class="space-y-2">${orderHtml}</div>
      </section>
      <section class="border-2 border-black p-4">
        <h4 class="text-xs font-bold uppercase mb-2">Tutti gli articoli pubblicati</h4>
        <div class="space-y-2">${allHtml}</div>
      </section>
    </div>
  `;
}

function resetCountdownForm() {
  countdownForm.reset();
  document.getElementById("countdownId").value = "";
  document.getElementById("countdownEmoji").value = "";
  document.getElementById("countdownActive").checked = true;
  document.getElementById("countdownIsFeatured").checked = false;
  renderCountdownSlugPreview();
}

function resetAgendaForm() {
  agendaForm.reset();
  document.getElementById("agendaEventId").value = "";
  renderAgendaSlugPreview();
}

function openSlideover(kind, { title, meta, onSave, onCancel }) {
  slideoverKind = kind;
  countdownForm.classList.toggle("hidden", kind !== "countdown");
  agendaForm.classList.toggle("hidden", kind !== "agenda");
  slideoverTitle.textContent = title || "";
  slideoverMeta.textContent = meta || "";
  activeContext = { onSave, onCancel };

  slideoverRoot.classList.remove("hidden");
  document.body.classList.add("overflow-hidden");
  requestAnimationFrame(() => {
    slideoverPanel.classList.remove("translate-x-full");
  });

  const firstField = kind === "countdown"
    ? document.getElementById("countdownTitle")
    : document.getElementById("agendaTitle");
  setTimeout(() => firstField?.focus(), 220);
}

function closeSlideover() {
  slideoverPanel.classList.add("translate-x-full");
  document.body.classList.remove("overflow-hidden");
  setTimeout(() => {
    slideoverRoot.classList.add("hidden");
    countdownForm.classList.add("hidden");
    agendaForm.classList.add("hidden");
  }, 200);
  slideoverKind = null;
  activeContext = null;
}

function setSlideoverSaving(saving) {
  isSlideoverSaving = saving;
  slideoverSaveBtn.disabled = saving;
  slideoverCancelBtn.disabled = saving;
  slideoverCloseBtn.disabled = saving;
  slideoverSaveBtn.textContent = saving ? "Salvataggio..." : "Salva";
}

function startNewCountdown() {
  resetCountdownForm();
  openSlideover("countdown", {
    title: "Nuovo countdown",
    meta: "ID: non assegnato | Stato: bozza locale",
    onSave: () => countdownForm.requestSubmit(),
    onCancel: () => {
      resetCountdownForm();
      closeSlideover();
    }
  });
}

function fillCountdownForm(item) {
  document.getElementById("countdownId").value = item.id;
  document.getElementById("countdownTitle").value = item.title;
  document.getElementById("countdownEmoji").value = item.emoji || "";
  document.getElementById("countdownTargetAt").value = isoToDateTimeLocal(item.target_at);
  document.getElementById("countdownIsFeatured").checked = Boolean(item.is_featured);
  document.getElementById("countdownActive").checked = Boolean(item.active);
  renderCountdownSlugPreview();

  openSlideover("countdown", {
    title: `${item.emoji ? `${item.emoji} ` : ""}${item.title}`,
    meta: `Slug: ${item.slug || "-"} | Stato: ${item.active ? "Online" : "Disattivo"}`,
    onSave: () => countdownForm.requestSubmit(),
    onCancel: () => {
      resetCountdownForm();
      closeSlideover();
    }
  });
}

function startNewEvent() {
  resetAgendaForm();
  openSlideover("agenda", {
    title: "Nuovo evento",
    meta: "ID: non assegnato",
    onSave: () => agendaForm.requestSubmit(),
    onCancel: () => {
      resetAgendaForm();
      closeSlideover();
    }
  });
}

function fillAgendaForm(item) {
  document.getElementById("agendaEventId").value = item.id;
  document.getElementById("agendaTitle").value = item.title;
  document.getElementById("agendaCategory").value = item.category;
  document.getElementById("agendaDate").value = normalizeAgendaDateInput(item.date);
  document.getElementById("agendaDescription").value = item.description;
  renderAgendaSlugPreview();

  openSlideover("agenda", {
    title: item.title,
    meta: `ID: ${item.id} | Data: ${formatLocalDate(normalizeAgendaDateInput(item.date)) || "-"}`,
    onSave: () => agendaForm.requestSubmit(),
    onCancel: () => {
      resetAgendaForm();
      closeSlideover();
    }
  });
}

function renderAdminCountdowns() {
  if (!countdowns.length) {
    adminCountdowns.innerHTML = '<p class="text-sm">Nessun countdown presente.</p>';
    return;
  }

  const sorted = [...countdowns].sort((a, b) => {
    if (a.is_featured === b.is_featured) return countdownSortValue(a.target_at) - countdownSortValue(b.target_at);
    return a.is_featured ? -1 : 1;
  });

  adminCountdowns.innerHTML = sorted.map((item) => `
    <article class="border-2 border-black p-4">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h4 class="text-lg font-semibold">${escapeHtml(item.emoji ? `${item.emoji} ${item.title}` : item.title)}</h4>
          <p class="text-sm mt-1">Data target: ${new Date(item.target_at).toLocaleString("it-IT", { dateStyle: "medium", timeStyle: "short" })}</p>
          <p class="text-xs mt-2">
            ID: ${escapeHtml(item.id)} | Slug: ${escapeHtml(item.slug || "-")} | Stato: ${item.active ? "Online" : "Disattivo"}
            ${item.is_featured ? " | In evidenza principale" : ""}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 md:justify-end">
          <button data-countdown-action="edit" data-id="${escapeHtml(item.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase">Modifica</button>
          <button data-countdown-action="delete" data-id="${escapeHtml(item.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase text-red-700">Elimina</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderAdminAgendaEvents() {
  if (!events.length) {
    adminAgendaEvents.innerHTML = '<p class="text-sm">Nessun evento presente.</p>';
    return;
  }

  adminAgendaEvents.innerHTML = events.map((item) => `
    <article class="border-2 border-black p-4">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <p class="text-xs uppercase font-bold text-accent">${escapeHtml(item.category)}</p>
          <h4 class="text-lg font-semibold">${escapeHtml(item.title)}</h4>
          <p class="text-sm mt-1">${escapeHtml(item.description)}</p>
          <p class="text-xs mt-2">ID: ${escapeHtml(item.id)} | Data: ${formatLocalDate(normalizeAgendaDateInput(item.date)) || "Data non valida"}</p>
        </div>
        <div class="flex flex-wrap gap-2 md:justify-end">
          <button data-agenda-action="edit" data-id="${escapeHtml(item.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase">Modifica</button>
          <button data-agenda-action="delete" data-id="${escapeHtml(item.id)}" class="border-2 border-black px-3 py-1 text-xs font-bold uppercase text-red-700">Elimina</button>
        </div>
      </div>
    </article>
  `).join("");
}

function renderArticleSubView() {
  const showEdit = currentArticleSubView === "articles";
  articlesView.classList.toggle("hidden", !showEdit);
  featuredView.classList.toggle("hidden", showEdit);
  openArticlesViewBtn.className = `border-2 border-black px-4 py-2 text-xs font-bold uppercase ${showEdit ? "bg-black text-white" : "bg-white"}`;
  openFeaturedViewBtn.className = `border-2 border-black px-4 py-2 text-xs font-bold uppercase ${showEdit ? "bg-white" : "bg-black text-white"}`;
  if (showEdit) {
    renderAdminArticles();
  } else {
    renderFeaturedManager();
  }
}

function parseHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [view = "dashboard", sub = ""] = raw.split("/").filter(Boolean);
  const known = NAV_ITEMS.some((item) => item.id === view);
  return { view: known ? view : "dashboard", sub };
}

function renderNavState() {
  document.querySelectorAll("#adminNav [data-nav]").forEach((btn) => {
    const active = btn.dataset.nav === currentView;
    btn.className = `flex items-center gap-2 shrink-0 border-2 border-black px-3 py-2 text-xs font-bold uppercase ${active ? "bg-black text-white" : "bg-white"}`;
  });
}

function renderCurrentView() {
  const views = ["dashboard", "articles", "countdown", "agenda", "settings"];
  views.forEach((view) => {
    document.getElementById(`view-${view}`)?.classList.toggle("hidden", view !== currentView);
  });
  renderNavState();
  renderStats();

  if (currentView === "articles") {
    renderArticleSubView();
  }
  if (currentView === "countdown") {
    renderAdminCountdowns();
  }
  if (currentView === "agenda") {
    renderAdminAgendaEvents();
  }
  if (currentView === "settings") {
    renderMaintenanceUi();
  }
}

function navigateToView(view, sub = "") {
  const hash = sub ? `#/${view}/${sub}` : `#/${view}`;
  if (window.location.hash === hash) {
    applyHashRoute();
  } else {
    window.location.hash = hash;
  }
}

function applyHashRoute() {
  if (!adminPanel || adminPanel.classList.contains("hidden")) return;
  const { view, sub } = parseHashRoute();
  currentView = view;
  if (view === "articles" && sub === "evidenza") {
    currentArticleSubView = "featured";
  } else if (view === "articles") {
    currentArticleSubView = "articles";
  }
  renderCurrentView();
}

async function handleAuthUi() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const isAuth = Boolean(data?.session);
  loginBox.classList.toggle("hidden", isAuth);
  adminPanel.classList.toggle("hidden", !isAuth);

  if (!isAuth) {
    setAdminStatus("");
    setLoginError("");
    closeSlideover();
    return false;
  }

  try {
    const isAdmin = await ensureCurrentUserIsAdmin();
    if (!isAdmin) {
      await supabase.auth.signOut({ scope: "local" });
      loginBox.classList.remove("hidden");
      adminPanel.classList.add("hidden");
      setLoginError("Utente autenticato ma non autorizzato: assegna ruolo admin in Supabase (tabella admin_users).");
      return false;
    }

    await loadData();
    setAdminStatus("");
    applyHashRoute();

    const { data: userData } = await supabase.auth.getUser();
    if (settingsAccountEmail) {
      settingsAccountEmail.textContent = userData?.user?.email || "admin";
    }
  } catch (err) {
    console.error(err);
    setAdminStatus("Login riuscito, ma errore nel caricamento dati admin (controlla schema/policy Supabase).");
  }

  return true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setLoginError("");

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const submitBtn = loginForm.querySelector("button[type='submit']");
  if (submitBtn instanceof HTMLButtonElement) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Accesso...";
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(authErrorMessage(error));
      return;
    }
    await handleAuthUi();
  } catch (err) {
    console.error(err);
    setLoginError(authErrorMessage(err));
  } finally {
    if (submitBtn instanceof HTMLButtonElement) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Accedi";
    }
  }
});

maintenanceModeSaveBtn?.addEventListener("click", async () => {
  if (!(maintenanceModeInput instanceof HTMLInputElement)) return;

  const turningOn = maintenanceModeInput.checked && !siteSettings.maintenanceMode;
  if (turningOn) {
    const confirmed = await confirmDialog({
      title: "Attivare la manutenzione?",
      message: "Il sito pubblico verra bloccato e reindirizzato a /manutenzione. L'area admin resta accessibile.",
      confirmLabel: "Attiva manutenzione",
      danger: true,
      typedConfirmation: "ATTIVA"
    });
    if (!confirmed) {
      maintenanceModeInput.checked = Boolean(siteSettings.maintenanceMode);
      return;
    }
  }

  maintenanceModeSaveBtn.disabled = true;
  maintenanceModeSaveBtn.textContent = "Salvataggio...";

  try {
    siteSettings = await saveSiteSettings({ maintenanceMode: maintenanceModeInput.checked });
    featuredIds = [...siteSettings.featuredArticleIds];
    renderMaintenanceUi();
    showToast(
      siteSettings.maintenanceMode
        ? "Modalita manutenzione attivata. Il sito pubblico verra bloccato."
        : "Modalita manutenzione disattivata. Il sito pubblico torna accessibile."
    );
  } catch (error) {
    console.error(error);
    maintenanceModeInput.checked = Boolean(siteSettings.maintenanceMode);
    showToast("Impossibile aggiornare la modalita manutenzione.", "error");
  } finally {
    maintenanceModeSaveBtn.disabled = false;
    maintenanceModeSaveBtn.textContent = "Salva stato manutenzione";
  }
});

let isNormalizingPhotos = false;

normalizePhotosBtn?.addEventListener("click", async () => {
  if (isNormalizingPhotos) return;

  const confirmed = await confirmDialog({
    title: "Normalizzare tutte le foto?",
    message: "Le foto articoli esistenti verranno riscaricate, convertite in SDR e ridimensionate al massimo in Full HD (1920x1080). L'operazione puo richiedere alcuni minuti.",
    confirmLabel: "Normalizza foto",
    danger: true,
    typedConfirmation: "NORMALIZZA"
  });
  if (!confirmed) return;

  isNormalizingPhotos = true;
  normalizePhotosBtn.disabled = true;
  normalizePhotosProgress.classList.remove("hidden");
  normalizePhotosProgress.textContent = "Normalizzazione foto esistenti avviata...";

  try {
    const result = await normalizeAllArticleImages({
      onProgress: ({ done, failed, total }) => {
        normalizePhotosProgress.textContent = `Normalizzazione foto esistenti: ${done}/${total} completate${failed ? `, ${failed} con errore` : ""}`;
      }
    });

    if (result.failed) {
      showToast(`Normalizzazione completata con errori: ${result.done} aggiornate, ${result.failed} non aggiornate.`, "warning");
    } else if (result.done) {
      showToast(`Normalizzazione completata: ${result.done} immagini aggiornate (SDR + max Full HD).`);
    } else {
      showToast("Nessuna foto da normalizzare.", "warning");
    }
  } catch (error) {
    console.error(error);
    showToast(error?.message || "Errore durante la normalizzazione delle immagini esistenti.", "error");
  } finally {
    isNormalizingPhotos = false;
    normalizePhotosBtn.disabled = false;
  }
});

async function handleLogout() {
  await supabase.auth.signOut();
  await handleAuthUi();
}

logoutBtn?.addEventListener("click", handleLogout);
logoutBtnDesktop?.addEventListener("click", handleLogout);

document.querySelectorAll("#adminNav [data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    navigateToView(btn.dataset.nav);
  });
});

newArticleBtn?.addEventListener("click", () => {
  window.location.href = "/admin-article-editor/?mode=new";
});

openArticlesViewBtn?.addEventListener("click", () => {
  navigateToView("articles", "lista");
});

openFeaturedViewBtn?.addEventListener("click", () => {
  navigateToView("articles", "evidenza");
});

document.getElementById("quickNewArticleBtn")?.addEventListener("click", () => {
  window.location.href = "/admin-article-editor/?mode=new";
});

document.getElementById("quickNewCountdownBtn")?.addEventListener("click", startNewCountdown);
document.getElementById("quickNewEventBtn")?.addEventListener("click", startNewEvent);
document.getElementById("quickFeaturedBtn")?.addEventListener("click", () => navigateToView("articles", "evidenza"));
document.getElementById("quickSettingsBtn")?.addEventListener("click", () => navigateToView("settings"));

newCountdownBtn?.addEventListener("click", startNewCountdown);
newAgendaBtn?.addEventListener("click", startNewEvent);

document.getElementById("countdownTitle")?.addEventListener("input", renderCountdownSlugPreview);
document.getElementById("countdownId")?.addEventListener("change", renderCountdownSlugPreview);
document.getElementById("agendaTitle")?.addEventListener("input", renderAgendaSlugPreview);
document.getElementById("agendaEventId")?.addEventListener("change", renderAgendaSlugPreview);

slideoverSaveBtn?.addEventListener("click", () => {
  if (activeContext?.onSave) activeContext.onSave();
});

slideoverCancelBtn?.addEventListener("click", () => {
  if (activeContext?.onCancel) activeContext.onCancel();
});

slideoverCloseBtn?.addEventListener("click", () => {
  if (activeContext?.onCancel) activeContext.onCancel();
});

slideoverBackdrop?.addEventListener("click", () => {
  if (activeContext?.onCancel) activeContext.onCancel();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && slideoverKind && activeContext?.onCancel) {
    activeContext.onCancel();
  }
});

countdownForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSlideoverSaving) return;

  try {
    setSlideoverSaving(true);

    const id = document.getElementById("countdownId").value || crypto.randomUUID();
    const now = new Date().toISOString();
    const title = document.getElementById("countdownTitle").value.trim();
    const emoji = normalizeCountdownEmoji(document.getElementById("countdownEmoji").value);
    const targetAtIso = dateTimeLocalToIso(document.getElementById("countdownTargetAt").value);
    const isFeatured = document.getElementById("countdownIsFeatured").checked;
    const active = document.getElementById("countdownActive").checked;

    if (!title) throw new Error("Titolo countdown obbligatorio.");
    if (!targetAtIso) throw new Error("Data target non valida.");

    const existing = countdowns.find((item) => item.id === id);
    const payload = {
      id,
      slug: countdownSlug(title, targetAtIso, existing?.slug),
      title,
      emoji,
      target_at: targetAtIso,
      is_featured: isFeatured,
      active,
      updated_at: now
    };

    if (!existing) payload.created_at = now;

    if (isFeatured) {
      const { error: clearFeaturedError } = await supabase
        .from("countdowns")
        .update({ is_featured: false, updated_at: now })
        .neq("id", id);
      if (clearFeaturedError) throw clearFeaturedError;
    }

    const { error } = await supabase.from("countdowns").upsert(payload, { onConflict: "id" });
    if (error) throw error;

    await loadData();
    renderStats();
    renderAdminCountdowns();
    resetCountdownForm();
    closeSlideover();
    showToast("Countdown salvato correttamente.");
  } catch (err) {
    console.error(err);
    showToast(err?.message || "Errore durante il salvataggio del countdown.", "error");
  } finally {
    setSlideoverSaving(false);
  }
});

agendaForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSlideoverSaving) return;

  try {
    setSlideoverSaving(true);

    const id = document.getElementById("agendaEventId").value || crypto.randomUUID();
    const now = new Date().toISOString();

    const payload = {
      id,
      title: document.getElementById("agendaTitle").value.trim(),
      category: document.getElementById("agendaCategory").value.trim(),
      date: document.getElementById("agendaDate").value,
      description: document.getElementById("agendaDescription").value.trim(),
      updated_at: now
    };

    if (!events.find((item) => item.id === id)) payload.created_at = now;

    const { error } = await supabase.from("agenda_events").upsert(payload, { onConflict: "id" });
    if (error) throw error;

    await loadData();
    renderStats();
    renderAdminAgendaEvents();
    resetAgendaForm();
    closeSlideover();
    showToast("Evento agenda salvato correttamente.");
  } catch (err) {
    console.error(err);
    showToast("Errore durante il salvataggio dell'evento.", "error");
  }
});

async function handleArticleAction(action, id) {
  const article = articles.find((item) => item.id === id);
  if (!article) return;

  try {
    if (action === "toggle") {
      const { error } = await supabase
        .from("articles")
        .update({ published: !article.published, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await loadData();
      renderStats();
      renderArticleSubView();
      showToast(article.published ? "Articolo spostato nelle bozze." : "Articolo pubblicato.");
      return;
    }

    if (action === "delete") {
      const confirmed = await confirmDialog({
        title: "Eliminare l'articolo?",
        message: `Vuoi eliminare definitivamente "${article.title}"? L'operazione non e reversibile.`,
        confirmLabel: "Elimina",
        danger: true
      });
      if (!confirmed) return;
      const { error } = await supabase.from("articles").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      renderStats();
      renderArticleSubView();
      showToast("Articolo eliminato.");
    }
  } catch (err) {
    console.error(err);
    showToast("Errore operazione articolo.", "error");
  }
}

adminArticlesOnline.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.articleAction;
  const id = target.dataset.id;
  if (!action || !id) return;
  handleArticleAction(action, id);
});

adminArticlesDrafts.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const action = target.dataset.articleAction;
  const id = target.dataset.id;
  if (!action || !id) return;
  handleArticleAction(action, id);
});

adminCountdowns.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.countdownAction;
  const id = target.dataset.id;
  if (!action || !id) return;

  const item = countdowns.find((countdown) => countdown.id === id);
  if (!item) return;

  try {
    if (action === "edit") {
      fillCountdownForm(item);
      return;
    }

    if (action === "delete") {
      const confirmed = await confirmDialog({
        title: "Eliminare il countdown?",
        message: `Vuoi eliminare definitivamente "${item.title}"? L'operazione non e reversibile.`,
        confirmLabel: "Elimina",
        danger: true
      });
      if (!confirmed) return;
      const { error } = await supabase.from("countdowns").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      renderStats();
      renderAdminCountdowns();
      showToast("Countdown eliminato.");
    }
  } catch (err) {
    console.error(err);
    showToast("Errore operazione countdown.", "error");
  }
});

adminAgendaEvents.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.agendaAction;
  const id = target.dataset.id;
  if (!action || !id) return;

  const item = events.find((eventItem) => eventItem.id === id);
  if (!item) return;

  try {
    if (action === "edit") {
      fillAgendaForm(item);
      return;
    }

    if (action === "delete") {
      const confirmed = await confirmDialog({
        title: "Eliminare l'evento?",
        message: `Vuoi eliminare definitivamente "${item.title}"? L'operazione non e reversibile.`,
        confirmLabel: "Elimina",
        danger: true
      });
      if (!confirmed) return;
      const { error } = await supabase.from("agenda_events").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      renderStats();
      renderAdminAgendaEvents();
      showToast("Evento eliminato.");
    }
  } catch (err) {
    console.error(err);
    showToast("Errore operazione agenda.", "error");
  }
});

featuredManagerList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const action = target.dataset.featureAction;
  const id = target.dataset.id;
  if (!action || !id) return;

  const isPublished = articles.some((item) => item.id === id && item.published);
  if (!isPublished) return;

  if (action === "move-up" || action === "move-down") {
    const working = getEffectiveFeaturedIds();
    const index = working.indexOf(id);
    const targetIndex = action === "move-up" ? index - 1 : index + 1;
    if (index < 0 || targetIndex < 0 || targetIndex >= working.length) return;
    [working[index], working[targetIndex]] = [working[targetIndex], working[index]];
    featuredIds = working;

    try {
      await upsertFeaturedIds();
      renderFeaturedManager();
    } catch (err) {
      console.error(err);
      showToast("Errore riordino evidenza.", "error");
    }
    return;
  }

  const working = getEffectiveFeaturedIds();
  const index = working.indexOf(id);
  if (action === "add" && index === -1) working.push(id);
  if (action === "remove" && index >= 0) working.splice(index, 1);
  featuredIds = working;

  try {
    await upsertFeaturedIds();
    renderFeaturedManager();
  } catch (err) {
    console.error(err);
    showToast("Errore salvataggio evidenza.", "error");
  }
});

function reorderFeaturedByDrag(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const working = getEffectiveFeaturedIds();
  const from = working.indexOf(fromId);
  const to = working.indexOf(toId);
  if (from < 0 || to < 0) return;

  const copy = [...working];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  featuredIds = copy;
}

featuredManagerList.addEventListener("dragstart", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const card = target.closest("[data-drag-id]");
  if (!(card instanceof HTMLElement)) return;

  draggedFeaturedId = card.dataset.dragId || null;
  if (event.dataTransfer && draggedFeaturedId) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedFeaturedId);
  }
  card.classList.add("opacity-60");
});

featuredManagerList.addEventListener("dragover", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const card = target.closest("[data-drag-id]");
  if (!(card instanceof HTMLElement)) return;

  event.preventDefault();
  featuredManagerList.querySelectorAll("[data-drag-id]").forEach((item) => item.classList.remove("ring-2", "ring-accent"));
  card.classList.add("ring-2", "ring-accent");
});

featuredManagerList.addEventListener("drop", async (event) => {
  event.preventDefault();
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const card = target.closest("[data-drag-id]");
  if (!(card instanceof HTMLElement)) return;

  reorderFeaturedByDrag(draggedFeaturedId, card.dataset.dragId || null);
  draggedFeaturedId = null;

  try {
    await upsertFeaturedIds();
    renderFeaturedManager();
  } catch (err) {
    console.error(err);
    showToast("Errore riordino evidenza.", "error");
  }
});

featuredManagerList.addEventListener("dragend", () => {
  draggedFeaturedId = null;
  featuredManagerList.querySelectorAll("[data-drag-id]").forEach((item) => item.classList.remove("opacity-60", "ring-2", "ring-accent"));
});

window.addEventListener("hashchange", applyHashRoute);

supabase.auth.onAuthStateChange(() => {
  handleAuthUi().catch((err) => {
    console.error(err);
    setLoginError("Errore sincronizzazione sessione.");
  });
});

async function bootstrapAdmin() {
  resetCountdownForm();
  resetAgendaForm();

  if (REQUIRE_LOGIN_ON_EACH_VISIT) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (err) {
      console.error(err);
    }
  }

  await handleAuthUi();
}

bootstrapAdmin().catch((err) => {
  console.error(err);
  setLoginError("Errore inizializzazione admin.");
});
