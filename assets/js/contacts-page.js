import { CONTACTS } from "./site-content.js?v=20260312a";

const CONTACT_COPY = {
  Instagram: "Scrivici su Instagram.",
  "Email info": "Supporto e informazioni.",
  "Proposte articoli": "Invia una proposta articolo.",
  "Contatti admin": "Contatto diretto admin."
};

const mount = document.getElementById("contactsGrid");

if (mount) {
  mount.innerHTML = CONTACTS.map((item) => `
    <a
      href="${item.href}"
      ${item.href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}
      class="block border-2 border-black bg-paper p-5 shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <p class="text-xs font-bold uppercase tracking-wide text-accent">${item.label}</p>
      <p class="mt-2 text-2xl font-semibold break-all">${item.value}</p>
      <p class="mt-2 text-sm text-slate-600">${CONTACT_COPY[item.label] || ""}</p>
    </a>
  `).join("");
}
