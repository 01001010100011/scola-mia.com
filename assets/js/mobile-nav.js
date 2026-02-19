const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const mobileMenuCloseBtn = document.getElementById("mobileMenuCloseBtn");
const mobileMenuBackdrop = document.getElementById("mobileMenuBackdrop");
const mobileMenuDrawer = document.getElementById("mobileMenuDrawer");

function openMobileMenu() {
  if (!mobileMenuBackdrop || !mobileMenuDrawer || !mobileMenuBtn) return;
  mobileMenuBackdrop.classList.remove("hidden");
  requestAnimationFrame(() => {
    mobileMenuDrawer.classList.remove("translate-x-full");
  });
  mobileMenuBtn.setAttribute("aria-expanded", "true");
  document.body.classList.add("overflow-hidden");
}

function closeMobileMenu() {
  if (!mobileMenuBackdrop || !mobileMenuDrawer || !mobileMenuBtn) return;
  mobileMenuDrawer.classList.add("translate-x-full");
  mobileMenuBtn.setAttribute("aria-expanded", "false");
  setTimeout(() => {
    mobileMenuBackdrop.classList.add("hidden");
  }, 200);
  document.body.classList.remove("overflow-hidden");
}

mobileMenuBtn?.addEventListener("click", openMobileMenu);
mobileMenuCloseBtn?.addEventListener("click", closeMobileMenu);
mobileMenuBackdrop?.addEventListener("click", (event) => {
  if (event.target === mobileMenuBackdrop) closeMobileMenu();
});
window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) closeMobileMenu();
});
