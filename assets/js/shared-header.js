const NAV_ITEMS = [
  { href: "/", desktopLabel: "Home", drawerLabel: "Home" },
  { href: "/archivio/", desktopLabel: "Articoli", drawerLabel: "Archivio" },
  { href: "/countdown/", desktopLabel: "Countdown", drawerLabel: "Countdown" },
  { href: "/agenda/", desktopLabel: "Agenda", drawerLabel: "Agenda" },
  { href: "/contatti/", desktopLabel: "Contatti", drawerLabel: "Contatti" }
];

function desktopNavHtml(activeHref) {
  return NAV_ITEMS.map((item) => {
    const cls = item.href === activeHref ? "text-accent" : "hover:text-accent";
    return `          <a href="${item.href}" class="${cls}">${item.desktopLabel}</a>`;
  }).join("\n");
}

function drawerNavHtml() {
  return NAV_ITEMS.map((item) => `          <a href="${item.href}" class="border-2 border-black bg-white px-3 py-2">${item.drawerLabel}</a>`).join("\n");
}

function buildSharedHeaderHtml({ activeHref = "", withSearch = false }) {
  const searchForm = withSearch
    ? `
          <form id="homeSearchForm" class="hidden lg:flex items-center border-2 border-black bg-white">
            <span class="material-symbols-outlined text-base px-2">search</span>
            <input id="homeSearchInput" type="search" placeholder="Cerca ovunque" class="border-0 focus:ring-0 text-xs font-semibold py-2 w-32 md:w-44" />
          </form>
`
    : "";
  const mobileSearchLink = withSearch
    ? `
          <a href="/ricerca/?focus=1" class="lg:hidden border-2 border-black bg-white p-2 shadow-brutal" aria-label="Apri ricerca universale">
            <span class="material-symbols-outlined block">search</span>
          </a>
`
    : "";
  const actionsCellClass = withSearch
    ? "flex items-center justify-end min-w-[44px] gap-2 lg:justify-self-end"
    : "flex items-center justify-end min-w-[44px] lg:justify-self-end";

  return `
    <header class="sticky top-0 z-50 bg-paper border-b-4 border-black">
      <div class="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <a href="/" class="flex items-center gap-3">
          <div class="border-2 border-black bg-white w-10 h-10 overflow-hidden">
            <img src="/assets/logo-scola-mia.svg" alt="Logo scola-mia.com" class="w-full h-full object-cover" />
          </div>
          <div>
            <p class="headline text-3xl leading-none">scola-mia.com</p>
            <p data-page-label class="text-xs font-semibold uppercase tracking-wider"></p>
          </div>
        </a>
        <nav class="hidden lg:flex items-center gap-6 text-sm font-bold uppercase justify-self-center">
${desktopNavHtml(activeHref)}
        </nav>
        <div class="${actionsCellClass}">${searchForm}${mobileSearchLink}
          <button id="mobileMenuBtn" type="button" class="lg:hidden border-2 border-black bg-white p-2 shadow-brutal" aria-label="Apri menu" aria-controls="mobileMenuBackdrop" aria-expanded="false">
            <span class="material-symbols-outlined block">menu</span>
          </button>
        </div>
      </div>
    </header>
    <div id="mobileMenuBackdrop" class="fixed inset-0 z-[70] hidden lg:hidden bg-black/50">
      <aside id="mobileMenuDrawer" class="ml-auto h-full w-[84%] max-w-xs border-l-4 border-black bg-paper p-5 transform translate-x-full transition-transform duration-200 ease-out">
        <div class="flex items-center justify-between">
          <p class="headline text-4xl">Menu</p>
          <button id="mobileMenuCloseBtn" type="button" class="border-2 border-black bg-white p-1.5" aria-label="Chiudi menu">
            <span class="material-symbols-outlined block">close</span>
          </button>
        </div>
        <nav class="mt-6 grid gap-2 text-xs font-bold uppercase">
${drawerNavHtml()}
        </nav>
      </aside>
    </div>
  `;
}

function renderSharedHeader() {
  const mount = document.querySelector("[data-shared-header-mount]");
  if (!mount) return;
  mount.innerHTML = buildSharedHeaderHtml({
    activeHref: mount.dataset.headerActive || "",
    withSearch: mount.dataset.headerSearch === "true"
  });
}

renderSharedHeader();
