import { escapeHtml, supabase, toSlugSafeName } from "./supabase-client.js";

const BUCKET = "article-media";

const form = document.getElementById("articleEditorForm");
const editorError = document.getElementById("editorError");
const saveFromBannerBtn = document.getElementById("saveFromBannerBtn");
const cancelBtn = document.getElementById("cancelBtn");

const contextTitle = document.getElementById("editorContextTitle");
const contextMeta = document.getElementById("editorContextMeta");

const articleIdInput = document.getElementById("articleId");
const titleInput = document.getElementById("title");
const categoryInput = document.getElementById("category");
const excerptInput = document.getElementById("excerpt");
const contentInput = document.getElementById("content");
const publishedInput = document.getElementById("published");
const submitBtn = document.getElementById("submitArticleBtn");

const articleImageInput = document.getElementById("articleImageInput");
const articleImagePreview = document.getElementById("articleImagePreview");
const removeArticleImageBtn = document.getElementById("removeArticleImageBtn");
const articleAttachmentInput = document.getElementById("articleAttachmentInput");
const articleAttachmentList = document.getElementById("articleAttachmentList");

let originalRecord = null;
let currentArticleImageUrl = "";
let currentArticleImagePath = "";
let currentArticleImageFile = null;
let currentArticleAttachments = [];

function setError(message = "") {
  if (!message) {
    editorError.classList.add("hidden");
    editorError.textContent = "";
    return;
  }
  editorError.textContent = message;
  editorError.classList.remove("hidden");
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function renderAttachmentList() {
  if (!currentArticleAttachments.length) {
    articleAttachmentList.innerHTML = '<p class="text-[11px] text-slate-600">Nessun allegato caricato.</p>';
    return;
  }

  articleAttachmentList.innerHTML = currentArticleAttachments.map((item) => `
    <div class="border-2 border-black p-2 flex items-center justify-between gap-2">
      <div class="min-w-0">
        <p class="text-xs font-semibold truncate">${escapeHtml(item.name)}</p>
        <p class="text-[11px] text-slate-600">${escapeHtml(item.type || "file")} • ${formatBytes(item.size || 0)} ${item._newFile ? "• da caricare" : ""}</p>
      </div>
      <button type="button" data-attachment-remove-id="${item.id}" class="border-2 border-black px-2 py-1 text-[10px] font-bold uppercase">Rimuovi</button>
    </div>
  `).join("");
}

function setImagePreview(url = "") {
  if (!url) {
    articleImagePreview.classList.add("hidden");
    articleImagePreview.removeAttribute("src");
    removeArticleImageBtn.classList.add("hidden");
    return;
  }
  articleImagePreview.src = url;
  articleImagePreview.classList.remove("hidden");
  removeArticleImageBtn.classList.remove("hidden");
}

function syncContext() {
  const id = articleIdInput.value || "non assegnato";
  const status = publishedInput.checked ? "Online" : "Bozza";
  contextTitle.textContent = titleInput.value.trim() || (articleIdInput.value ? "Articolo in modifica" : "Nuovo articolo");
  contextMeta.textContent = `ID: ${id} | Stato: ${status}`;
}

async function ensureCurrentUserIsAdmin() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  const userId = authData?.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id,role,active")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data && data.role === "admin");
}

async function uploadToStorage(articleId, file, kind) {
  const stamp = Date.now();
  const cleanName = toSlugSafeName(file.name);
  const path = `articles/${articleId}/${kind}/${stamp}-${cleanName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

function mapRecordToForm(record) {
  articleIdInput.value = record.id;
  titleInput.value = record.title || "";
  categoryInput.value = record.category || "";
  excerptInput.value = record.excerpt || "";
  contentInput.value = record.content || "";
  publishedInput.checked = Boolean(record.published);

  currentArticleImageUrl = record.image_url || "";
  currentArticleImagePath = record.image_path || "";
  currentArticleImageFile = null;
  articleImageInput.value = "";
  setImagePreview(currentArticleImageUrl);

  currentArticleAttachments = Array.isArray(record.attachments) ? record.attachments.map((att) => ({ ...att })) : [];
  articleAttachmentInput.value = "";
  renderAttachmentList();

  submitBtn.textContent = "Aggiorna Articolo";
  syncContext();
}

function resetToNew() {
  originalRecord = null;
  form.reset();
  articleIdInput.value = "";
  publishedInput.checked = false;

  currentArticleImageUrl = "";
  currentArticleImagePath = "";
  currentArticleImageFile = null;
  articleImageInput.value = "";
  setImagePreview("");

  currentArticleAttachments = [];
  articleAttachmentInput.value = "";
  renderAttachmentList();

  submitBtn.textContent = "Salva Articolo";
  syncContext();
}

async function loadArticle(id) {
  const { data, error } = await supabase
    .from("articles")
    .select("id,title,category,excerpt,content,image_url,image_path,published,attachments,created_at,updated_at")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

async function bootstrap() {
  setError("");
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData?.session) {
    window.location.href = "admin.html";
    return;
  }

  const isAdmin = await ensureCurrentUserIsAdmin();
  if (!isAdmin) {
    await supabase.auth.signOut({ scope: "local" });
    window.location.href = "admin.html";
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    resetToNew();
    return;
  }

  const record = await loadArticle(id);
  if (!record) {
    setError("Articolo non trovato.");
    resetToNew();
    return;
  }

  originalRecord = structuredClone(record);
  mapRecordToForm(record);
}

articleImageInput.addEventListener("change", () => {
  const file = articleImageInput.files?.[0];
  if (!file) return;
  currentArticleImageFile = file;

  const reader = new FileReader();
  reader.onload = () => {
    const preview = typeof reader.result === "string" ? reader.result : "";
    if (!preview) return;
    currentArticleImageUrl = preview;
    setImagePreview(preview);
  };
  reader.readAsDataURL(file);
});

removeArticleImageBtn.addEventListener("click", () => {
  currentArticleImageUrl = "";
  currentArticleImagePath = "";
  currentArticleImageFile = null;
  articleImageInput.value = "";
  setImagePreview("");
  syncContext();
});

articleAttachmentInput.addEventListener("change", () => {
  const files = Array.from(articleAttachmentInput.files || []);
  if (!files.length) return;

  currentArticleAttachments = currentArticleAttachments.concat(
    files.map((file) => ({
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      type: file.type,
      size: file.size,
      _newFile: true,
      _file: file
    }))
  );

  articleAttachmentInput.value = "";
  renderAttachmentList();
});

articleAttachmentList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const removeId = target.dataset.attachmentRemoveId;
  if (!removeId) return;
  currentArticleAttachments = currentArticleAttachments.filter((item) => item.id !== removeId);
  renderAttachmentList();
});

saveFromBannerBtn.addEventListener("click", () => form.requestSubmit());

cancelBtn.addEventListener("click", () => {
  if (originalRecord) {
    mapRecordToForm(originalRecord);
    return;
  }
  resetToNew();
});

[titleInput, categoryInput, excerptInput, contentInput, publishedInput].forEach((node) => {
  node.addEventListener("input", syncContext);
  node.addEventListener("change", syncContext);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setError("");

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvataggio...";

    const now = new Date().toISOString();
    const id = articleIdInput.value || crypto.randomUUID();

    let imageUrl = currentArticleImageUrl;
    let imagePath = currentArticleImagePath;

    if (currentArticleImageFile) {
      const uploaded = await uploadToStorage(id, currentArticleImageFile, "images");
      imageUrl = uploaded.url;
      imagePath = uploaded.path;
    }

    const attachments = [];
    for (const item of currentArticleAttachments) {
      if (item._newFile && item._file) {
        const uploaded = await uploadToStorage(id, item._file, "attachments");
        attachments.push({
          id: crypto.randomUUID(),
          name: item.name,
          type: item.type,
          size: item.size,
          path: uploaded.path,
          url: uploaded.url
        });
      } else {
        attachments.push({
          id: item.id,
          name: item.name,
          type: item.type,
          size: item.size,
          path: item.path,
          url: item.url
        });
      }
    }

    const payload = {
      title: titleInput.value.trim(),
      category: categoryInput.value.trim(),
      excerpt: excerptInput.value.trim(),
      content: contentInput.value.trim(),
      image_url: imageUrl || null,
      image_path: imagePath || null,
      attachments,
      published: publishedInput.checked,
      updated_at: now
    };

    let saved = null;

    if (articleIdInput.value) {
      const { data, error } = await supabase
        .from("articles")
        .update(payload)
        .eq("id", id)
        .select("id,title,category,excerpt,content,image_url,image_path,published,attachments,created_at,updated_at")
        .single();
      if (error) throw error;
      saved = data;
    } else {
      const { data, error } = await supabase
        .from("articles")
        .insert({ id, ...payload, created_at: now })
        .select("id,title,category,excerpt,content,image_url,image_path,published,attachments,created_at,updated_at")
        .single();
      if (error) throw error;
      saved = data;
      history.replaceState(null, "", `admin-article-editor.html?id=${encodeURIComponent(saved.id)}`);
    }

    originalRecord = structuredClone(saved);
    mapRecordToForm(saved);
  } catch (error) {
    console.error(error);
    setError(error?.message || "Errore durante il salvataggio dell'articolo.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = articleIdInput.value ? "Aggiorna Articolo" : "Salva Articolo";
  }
});

bootstrap().catch((error) => {
  console.error(error);
  setError("Errore inizializzazione editor articolo.");
});
