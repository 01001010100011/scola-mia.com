import { initCloudflareAnalytics } from "./cloudflare-analytics.js";

const FOOTER_HTML = `
  <footer class="border-t-4 border-black bg-black text-white">
    <div class="max-w-7xl mx-auto px-4 md:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <p class="headline text-4xl">scola-mia.com</p>
        <p class="text-sm opacity-80">Liceo Statale Lorenzo Rocci, Viale della Gioventu, 16, RI | <a href="/contatti/" class="underline">Contatti</a></p>
      </div>
      <div class="text-xs uppercase font-bold tracking-wide">LR</div>
    </div>
  </footer>
`;

function renderSharedFooter() {
  if (document.body?.dataset?.noSharedFooter === "true") return;

  // Keep footer pinned to bottom on short pages (mobile + desktop).
  document.body.style.minHeight = "100vh";
  document.body.style.display = "flex";
  document.body.style.flexDirection = "column";
  const main = document.querySelector("main");
  if (main) {
    main.style.flex = "1";
  }

  const mount = document.querySelector("[data-shared-footer-mount]");
  if (mount) {
    mount.innerHTML = FOOTER_HTML;
    return;
  }

  if (!document.querySelector("footer")) {
    document.body.insertAdjacentHTML("beforeend", FOOTER_HTML);
  }
}

renderSharedFooter();
initCloudflareAnalytics();
