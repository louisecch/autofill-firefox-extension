(() => {
  "use strict";

  const STORAGE_KEY = "profileData";
  const AI_SETTINGS_KEY = "aiSettings";
  const DEFAULT_PROFILE = {
    fullName: "",
    email: "",
    phone: "",
    linkedin: "",
    address: "",
    whyJoin: "",
    salaryExpectations: "",
    rightToWorkUK: "",
    rightToWorkUKText: "",
    noticePeriod: "",
    userResearchYears: "",
    londonTravel: "",
    startupExperienceYears: "",
    updatedAt: null
  };

  const DEFAULT_AI_SETTINGS = {
    enabled: false,
    provider: "openai",
    openaiApiKey: "",
    openaiModel: "gpt-4o-mini",
    valuesPromptTemplate:
      "Write a concise, professional answer (3-5 sentences) to the question below. " +
      "Tie the answer to one specific company value if provided, and make it concrete with 1 example. " +
      "Avoid making up facts about the company. Keep it confident and friendly.\n\n" +
      "Company: {{company}}\n" +
      "Question: {{question}}\n" +
      "Company values/context (may be empty):\n{{context}}\n"
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
      rightToWorkUK:
        typeof p.rightToWorkUK === "string" ? p.rightToWorkUK : "",
      rightToWorkUKText:
        typeof p.rightToWorkUKText === "string" ? p.rightToWorkUKText : "",
      noticePeriod:
        typeof p.noticePeriod === "string" ? p.noticePeriod : "",
      userResearchYears:
        typeof p.userResearchYears === "string" ? p.userResearchYears : "",
      londonTravel:
        typeof p.londonTravel === "string" ? p.londonTravel : "",
      startupExperienceYears:
        typeof p.startupExperienceYears === "string" ? p.startupExperienceYears : "",
      updatedAt: typeof p.updatedAt === "number" ? p.updatedAt : null
    };
  }

  function normalizeAiSettings(raw) {
    const s = raw && typeof raw === "object" ? raw : {};
    return {
      enabled: Boolean(s.enabled),
      provider: typeof s.provider === "string" ? s.provider : "openai",
      openaiApiKey: typeof s.openaiApiKey === "string" ? s.openaiApiKey : "",
      openaiModel: typeof s.openaiModel === "string" ? s.openaiModel : "gpt-4o-mini",
      valuesPromptTemplate:
        typeof s.valuesPromptTemplate === "string"
          ? s.valuesPromptTemplate
          : DEFAULT_AI_SETTINGS.valuesPromptTemplate
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

    const { [AI_SETTINGS_KEY]: aiStored } = await browser.storage.local.get({
      [AI_SETTINGS_KEY]: DEFAULT_AI_SETTINGS
    });
    const ai = normalizeAiSettings(aiStored);

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
    /** @type {HTMLSelectElement} */
    const rightToWorkUK = /** @type {any} */ (byId("rightToWorkUK"));
    /** @type {HTMLTextAreaElement} */
    const rightToWorkUKText = /** @type {any} */ (byId("rightToWorkUKText"));
    /** @type {HTMLInputElement} */
    const noticePeriod = /** @type {any} */ (byId("noticePeriod"));
    /** @type {HTMLInputElement} */
    const userResearchYears = /** @type {any} */ (byId("userResearchYears"));
    /** @type {HTMLTextAreaElement} */
    const londonTravel = /** @type {any} */ (byId("londonTravel"));
    /** @type {HTMLInputElement} */
    const startupExperienceYears = /** @type {any} */ (byId("startupExperienceYears"));
    /** @type {HTMLInputElement} */
    const aiEnabled = /** @type {any} */ (byId("aiEnabled"));
    /** @type {HTMLInputElement} */
    const openaiApiKey = /** @type {any} */ (byId("openaiApiKey"));
    /** @type {HTMLInputElement} */
    const openaiModel = /** @type {any} */ (byId("openaiModel"));
    /** @type {HTMLTextAreaElement} */
    const valuesPromptTemplate = /** @type {any} */ (byId("valuesPromptTemplate"));

    fullName.value = profile.fullName;
    email.value = profile.email;
    phone.value = profile.phone;
    linkedin.value = profile.linkedin;
    address.value = profile.address;
    whyJoin.value = profile.whyJoin;
    salaryExpectations.value = profile.salaryExpectations;
    rightToWorkUK.value = profile.rightToWorkUK;
    rightToWorkUKText.value = profile.rightToWorkUKText;
    noticePeriod.value = profile.noticePeriod;
    userResearchYears.value = profile.userResearchYears;
    londonTravel.value = profile.londonTravel;
    startupExperienceYears.value = profile.startupExperienceYears;

    aiEnabled.checked = Boolean(ai.enabled);
    openaiApiKey.value = ai.openaiApiKey;
    openaiModel.value = ai.openaiModel;
    valuesPromptTemplate.value = ai.valuesPromptTemplate;
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
    /** @type {HTMLSelectElement} */
    const rightToWorkUKEl = /** @type {any} */ (byId("rightToWorkUK"));
    /** @type {HTMLTextAreaElement} */
    const rightToWorkUKTextEl = /** @type {any} */ (byId("rightToWorkUKText"));
    /** @type {HTMLInputElement} */
    const noticePeriodEl = /** @type {any} */ (byId("noticePeriod"));
    /** @type {HTMLInputElement} */
    const userResearchYearsEl = /** @type {any} */ (byId("userResearchYears"));
    /** @type {HTMLTextAreaElement} */
    const londonTravelEl = /** @type {any} */ (byId("londonTravel"));
    /** @type {HTMLInputElement} */
    const startupExperienceYearsEl = /** @type {any} */ (byId("startupExperienceYears"));
    /** @type {HTMLInputElement} */
    const aiEnabledEl = /** @type {any} */ (byId("aiEnabled"));
    /** @type {HTMLInputElement} */
    const openaiApiKeyEl = /** @type {any} */ (byId("openaiApiKey"));
    /** @type {HTMLInputElement} */
    const openaiModelEl = /** @type {any} */ (byId("openaiModel"));
    /** @type {HTMLTextAreaElement} */
    const valuesPromptTemplateEl = /** @type {any} */ (byId("valuesPromptTemplate"));

    const profile = {
      fullName: fullNameEl.value.trim(),
      email: emailEl.value.trim(),
      phone: phoneEl.value.trim(),
      linkedin: linkedinEl.value.trim(),
      address: addressEl.value.trim(),
      whyJoin: whyJoinEl.value.trim(),
      salaryExpectations: salaryExpectationsEl.value.trim(),
      rightToWorkUK: String(rightToWorkUKEl.value || "").trim(),
      rightToWorkUKText: rightToWorkUKTextEl.value.trim(),
      noticePeriod: noticePeriodEl.value.trim(),
      userResearchYears: userResearchYearsEl.value.trim(),
      londonTravel: londonTravelEl.value.trim(),
      startupExperienceYears: startupExperienceYearsEl.value.trim(),
      updatedAt: Date.now()
    };

    const aiSettings = {
      ...DEFAULT_AI_SETTINGS,
      enabled: Boolean(aiEnabledEl.checked),
      openaiApiKey: openaiApiKeyEl.value.trim(),
      openaiModel: openaiModelEl.value.trim() || "gpt-4o-mini",
      valuesPromptTemplate:
        valuesPromptTemplateEl.value.trim() || DEFAULT_AI_SETTINGS.valuesPromptTemplate
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

    await browser.storage.local.set({ [STORAGE_KEY]: profile, [AI_SETTINGS_KEY]: aiSettings });
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
