(function () {
  const VERSION = "1.0";
  const KEYS = {
    version: "cookie_consent_version",
    choices: "cookie_consent_choices",
    updatedAt: "cookie_consent_updated_at"
  };

  function canUseStorage() {
    try {
      const testKey = "__scola_cookie_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  const storageEnabled = canUseStorage();

  function readJson(key) {
    if (!storageEnabled) return null;
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    if (!storageEnabled) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {}
  }

  function remove(key) {
    if (!storageEnabled) return;
    try {
      window.localStorage.removeItem(key);
    } catch {}
  }

  function normalizeChoices(choices) {
    return {
      necessary: true,
      analytics: Boolean(choices && choices.analytics)
    };
  }

  function buildConsentMeta(status, choices) {
    const normalized = normalizeChoices(choices);
    return {
      version: VERSION,
      status,
      updatedAt: new Date().toISOString(),
      choices: normalized
    };
  }

  function readStoredMeta() {
    if (!storageEnabled) return null;

    const storedVersion = window.localStorage.getItem(KEYS.version);
    const stored = readJson(KEYS.choices);
    if (!stored || storedVersion !== VERSION || stored.version !== VERSION) return null;

    return {
      version: VERSION,
      status: stored.status || "customized",
      updatedAt: stored.updatedAt || window.localStorage.getItem(KEYS.updatedAt) || new Date().toISOString(),
      choices: normalizeChoices(stored.choices)
    };
  }

  function saveMeta(meta) {
    write(KEYS.version, VERSION);
    write(KEYS.choices, JSON.stringify(meta));
    write(KEYS.updatedAt, meta.updatedAt);
  }

  function clearMeta() {
    remove(KEYS.version);
    remove(KEYS.choices);
    remove(KEYS.updatedAt);
  }

  function buildGoogleConsentPayload(analyticsEnabled) {
    return {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: analyticsEnabled ? "granted" : "denied"
    };
  }

  function queueZarazSet(key, value) {
    window.__scolaQueuedZarazSets = window.__scolaQueuedZarazSets || [];
    window.__scolaQueuedZarazSets.push({ key, value });
  }

  function flushQueuedZarazSets() {
    const queued = window.__scolaQueuedZarazSets || [];
    if (!queued.length) return;
    if (!window.zaraz || typeof window.zaraz.set !== "function") return;

    while (queued.length) {
      const item = queued.shift();
      try {
        window.zaraz.set(item.key, item.value);
      } catch {}
    }
  }

  function applyGoogleConsent(choices, mode) {
    const payload = buildGoogleConsentPayload(Boolean(choices && choices.analytics));
    const reservedKey = mode === "default" ? "google_consent_default" : "google_consent_update";

    if (window.zaraz && typeof window.zaraz.set === "function") {
      try {
        window.zaraz.set(reservedKey, payload);
      } catch {
        queueZarazSet(reservedKey, payload);
      }
      return payload;
    }

    queueZarazSet(reservedKey, payload);
    return payload;
  }

  const storedMeta = readStoredMeta();
  const hasStoredConsent = Boolean(storedMeta);
  const effectiveChoices = storedMeta ? storedMeta.choices : { necessary: true, analytics: false };

  applyGoogleConsent({ necessary: true, analytics: false }, "default");
  if (hasStoredConsent) {
    applyGoogleConsent(effectiveChoices, "update");
  }

  document.addEventListener("zarazConsentAPIReady", flushQueuedZarazSets);
  window.addEventListener("load", flushQueuedZarazSets);

  window.ScolaCookieConsent = {
    VERSION,
    KEYS,
    storageEnabled,
    readStoredMeta,
    saveMeta,
    clearMeta,
    buildConsentMeta,
    buildGoogleConsentPayload,
    applyGoogleConsent,
    normalizeChoices,
    flushQueuedZarazSets,
    hasStoredConsent,
    getUnknownMeta() {
      return {
        version: VERSION,
        status: "unknown",
        updatedAt: null,
        choices: { necessary: true, analytics: false }
      };
    }
  };
})();
