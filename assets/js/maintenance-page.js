import { CONTACTS } from "./site-content.js?v=20260312a";

const contactsMount = document.getElementById("maintenanceContacts");
const openContactsBtn = document.getElementById("openMaintenanceContactsBtn");
const closeContactsBtn = document.getElementById("closeMaintenanceContactsBtn");
const contactsModal = document.getElementById("maintenanceContactsModal");

const visibleContacts = CONTACTS.filter((item) => item.label === "Instagram" || item.label === "Email info");

if (contactsMount) {
  contactsMount.innerHTML = visibleContacts.map((item) => `
    <a
      href="${item.href}"
      ${item.href.startsWith("http") ? 'target="_blank" rel="noopener noreferrer"' : ""}
      class="block border-2 border-black bg-white px-4 py-3 shadow-brutal transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <p class="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">${item.label}</p>
      <p class="mt-1 text-base md:text-lg font-semibold break-all">${item.value}</p>
    </a>
  `).join("");
}

function toggleContactsModal(open) {
  if (!(contactsModal instanceof HTMLElement)) return;

  contactsModal.classList.toggle("hidden", !open);
  document.body.classList.toggle("overflow-hidden", open);

  if (open) {
    closeContactsBtn?.focus();
  } else {
    openContactsBtn?.focus();
  }
}

openContactsBtn?.addEventListener("click", () => toggleContactsModal(true));
closeContactsBtn?.addEventListener("click", () => toggleContactsModal(false));

contactsModal?.addEventListener("click", (event) => {
  if (event.target === contactsModal) {
    toggleContactsModal(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && contactsModal && !contactsModal.classList.contains("hidden")) {
    toggleContactsModal(false);
  }
});
