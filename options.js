(() => {
  "use strict";

  const STORAGE_KEY = "profileData";
  const DEFAULT_PROFILE = {
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    address: "",
    whyJoin: "",
    salaryExpectations: "",
    updatedAt: null
  };

  /** @returns {HTMLFormElement} */
  function mustGetForm() {
    const form = document.getElementById("profileForm");
    if (!(form instanceof HTMLFormElement)) {
      throw new Error("profileForm not found");
    }
    return form;
  }

  function byId(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
  }

  function setStatus(text, { isError = false, persistMs = 1600 } = {}) {
    const status = byId("status");
    status.textContent = text;
    status.style.color = isError ? "var(--danger)" : "var(--muted)";
    if (persistMs > 0) {
      window.clearTimeout(setStatus._t);
      setStatus._t = window.setTimeout(() => {
        status.textContent = "";
        status.style.color = "var(--muted)";
      }, persistMs);
    }
  }

  function normalizeProfile(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    return {
      fullName: typeof p.fullName === "string" ? p.fullName : "",
      email: typeof p.email === "string" ? p.email : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
      address: typeof p.address === "string" ? p.address : "",
      whyJoin: typeof p.whyJoin === "string" ? p.whyJoin : "",
      salaryExpectations:
        typeof p.salaryExpectations === "string" ? p.salaryExpectations : "",
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : null
    };
  }

  function isProbablyEmail(email) {
    const e = String(email).trim();
    if (!e) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  }

  async function loadProfileIntoForm() {
    const { [STORAGE_KEY]: stored } = await browser.storage.local.get({
      [STORAGE_KEY]: DEFAULT_PROFILE
    });
    const profile = normalizeProfile(stored);

    /** @type {HTMLInputElement} */
    const fullName = /** @type {any} */ (byId("fullName"));
    /** @type {HTMLInputElement} */
    const email = /** @type {any} */ (byId("email"));
    /** @type {HTMLInputElement} */
    const phone = /** @type {any} */ (byId("phone"));
    /** @type {HTMLInputElement} */
    const linkedin = /** @type {any} */ (byId("linkedin"));
    /** @type {HTMLTextAreaElement} */
    const address = /** @type {any} */ (byId("address"));
    /** @type {HTMLTextAreaElement} */
    const whyJoin = /** @type {any} */ (byId("whyJoin"));
    /** @type {HTMLInputElement} */
    const salaryExpectations = /** @type {any} */ (byId("salaryExpectations"));

    fullName.value = profile.fullName;
    email.value = profile.email;
    phone.value = profile.phone;
    linkedin.value = profile.linkedin;
    address.value = profile.address;
    whyJoin.value = profile.whyJoin;
    salaryExpectations.value = profile.salaryExpectations;
  }

  function isProbablyUrl(url) {
    const u = String(url).trim();
    if (!u) return true;
    try {
      const parsed = new URL(u);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      return false;
    }
  }

  async function saveProfileFromForm() {
    /** @type {HTMLInputElement} */
    const fullNameEl = /** @type {any} */ (byId("fullName"));
    /** @type {HTMLInputElement} */
    const emailEl = /** @type {any} */ (byId("email"));
    /** @type {HTMLInputElement} */
    const phoneEl = /** @type {any} */ (byId("phone"));
    /** @type {HTMLInputElement} */
    const linkedinEl = /** @type {any} */ (byId("linkedin"));
    /** @type {HTMLTextAreaElement} */
    const addressEl = /** @type {any} */ (byId("address"));
    /** @type {HTMLTextAreaElement} */
    const whyJoinEl = /** @type {any} */ (byId("whyJoin"));
    /** @type {HTMLInputElement} */
    const salaryExpectationsEl = /** @type {any} */ (byId("salaryExpectations"));

    const profile = {
      fullName: fullNameEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      linkedin: linkedinEl.value.trim(),
      address: addressEl.value.trim(),
      whyJoin: whyJoinEl.value.trim(),
      salaryExpectations: salaryExpectationsEl.value.trim(),
      updatedAt: Date.now()
    };

    if (!isProbablyEmail(profile.email)) {
      setStatus("That email doesn't look valid.", { isError: true, persistMs: 2400 });
      emailEl.focus();
      return;
    }

    if (!isProbablyUrl(profile.linkedin)) {
      setStatus("That LinkedIn URL doesn't look valid.", { isError: true, persistMs: 2400 });
      linkedinEl.focus();
      return;
    }

    await browser.storage.local.set({ [STORAGE_KEY]: profile });
    setStatus("Saved.");
  }

  async function clearSavedData() {
    await browser.storage.local.set({ [STORAGE_KEY]: { ...DEFAULT_PROFILE, updatedAt: Date.now() } });
    await loadProfileIntoForm();
    setStatus("Cleared.");
  }

  async function init() {
    await loadProfileIntoForm();

    const form = mustGetForm();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await saveProfileFromForm();
      } catch (err) {
        console.error(err);
        setStatus("Save failed. Check the console.", { isError: true, persistMs: 3000 });
      }
    });

    byId("clearBtn").addEventListener("click", async () => {
      try {
        await clearSavedData();
      } catch (err) {
        console.error(err);
        setStatus("Clear failed. Check the console.", { isError: true, persistMs: 3000 });
      }
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error(err);
      setStatus("Options failed to load. Check the console.", {
        isError: true,
        persistMs: 0
      });
    });
  });
})();
