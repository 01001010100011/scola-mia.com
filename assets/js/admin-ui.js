const TOAST_ICONS = { success: "check_circle", error: "error", warning: "warning" };

let toastStack = null;

function ensureToastStack() {
  if (toastStack && document.body.contains(toastStack)) return toastStack;
  toastStack = document.createElement("div");
  toastStack.id = "adminToastStack";
  toastStack.className = "fixed bottom-4 right-4 z-[130] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))] pointer-events-none";
  document.body.appendChild(toastStack);
  return toastStack;
}

export function showToast(message, type = "success", duration = 4000) {
  const stack = ensureToastStack();
  const toast = document.createElement("div");
  toast.setAttribute("role", "status");
  const palette = type === "error"
    ? "bg-red-100 text-red-800"
    : type === "warning"
      ? "bg-yellow-100 text-amber-900"
      : "bg-white text-ink";
  toast.className = `pointer-events-auto flex items-start gap-2 border-2 border-black shadow-brutal px-3 py-2 text-sm font-semibold ${palette}`;

  const icon = document.createElement("span");
  icon.className = "sm-icon text-[18px] leading-5 shrink-0";
  icon.textContent = TOAST_ICONS[type] || TOAST_ICONS.success;

  const text = document.createElement("span");
  text.className = "min-w-0";
  text.textContent = message;

  toast.append(icon, text);
  stack.appendChild(toast);
  if (duration > 0) setTimeout(() => toast.remove(), duration);
  return toast;
}

let activeDialog = null;

export function confirmDialog({
  title,
  message,
  confirmLabel = "Conferma",
  cancelLabel = "Annulla",
  danger = false,
  typedConfirmation = ""
} = {}) {
  return new Promise((resolve) => {
    if (activeDialog) {
      activeDialog.remove();
      activeDialog = null;
    }

    const finish = (result) => {
      document.removeEventListener("keydown", onKeydown, true);
      backdrop.remove();
      document.body.classList.remove("overflow-hidden");
      activeDialog = null;
      resolve(result);
    };

    const backdrop = document.createElement("div");
    backdrop.className = "fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50";

    const box = document.createElement("div");
    box.className = "w-full max-w-md bg-white border-4 border-black shadow-brutal";
    box.setAttribute("role", "alertdialog");
    box.setAttribute("aria-modal", "true");

    const heading = document.createElement("h3");
    heading.className = "headline text-3xl";
    heading.textContent = title || "Conferma";

    const body = document.createElement("p");
    body.className = "text-sm mt-2";
    body.textContent = message || "";

    const content = document.createElement("div");
    content.className = "p-5 space-y-3";
    content.append(heading, body);

    let confirmInput = null;
    if (typedConfirmation) {
      const hint = document.createElement("p");
      hint.className = "text-xs text-slate-600";
      hint.textContent = `Digita "${typedConfirmation}" per attivare il pulsante di conferma.`;
      confirmInput = document.createElement("input");
      confirmInput.type = "text";
      confirmInput.className = "w-full border-2 border-black px-2 py-1.5 text-sm";
      confirmInput.autocomplete = "off";
      confirmInput.spellcheck = false;
      confirmInput.addEventListener("input", () => {
        confirmBtn.disabled = confirmInput.value.trim() !== typedConfirmation;
      });
      confirmInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !confirmBtn.disabled) {
          event.preventDefault();
          finish(true);
        }
      });
      content.append(hint, confirmInput);
    }

    const buttons = document.createElement("div");
    buttons.className = "flex flex-wrap justify-end gap-2";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = cancelLabel;
    cancelBtn.className = "border-2 border-black bg-white px-4 py-2 text-xs font-bold uppercase";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.textContent = confirmLabel;
    confirmBtn.className = danger
      ? "border-2 border-black bg-red-700 text-white px-4 py-2 text-xs font-bold uppercase shadow-brutal"
      : "border-2 border-black bg-accent text-white px-4 py-2 text-xs font-bold uppercase shadow-brutal";
    confirmBtn.disabled = Boolean(typedConfirmation);

    cancelBtn.addEventListener("click", () => finish(false));
    confirmBtn.addEventListener("click", () => finish(true));

    const onKeydown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        finish(false);
      }
    };

    buttons.append(cancelBtn, confirmBtn);
    content.appendChild(buttons);
    box.appendChild(content);
    backdrop.appendChild(box);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) finish(false);
    });

    document.addEventListener("keydown", onKeydown, true);
    document.body.classList.add("overflow-hidden");
    document.body.appendChild(backdrop);
    activeDialog = backdrop;

    (confirmInput || confirmBtn).focus();
  });
}
