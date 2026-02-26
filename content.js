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
    rightToWorkUK: "",
    rightToWorkUKText: "",
    noticePeriod: "",
    userResearchYears: "",
    londonTravel: "",
    startupExperienceYears: "",
    updatedAt: null
  };

  const AI_SETTINGS_KEY = "aiSettings";

  const EMAIL_RE =
    /\b(e-?mail|email\s*address|emailaddress|contact\s*email|primary\s*email)\b/i;
  const EMAIL_NEG_RE = /\b(newsletter|subscribe|subscription)\b/i;

  const PHONE_RE = /\b(phone|mobile|cell|telephone|tel|contact\s*(no|num|number)|whatsapp)\b/i;
  const PHONE_NEG_RE = /\b(extension\s*(id|identifier)|telnet)\b/i;

  const LINKEDIN_RE = /\b(linked\s*in|linkedin)\b/i;

  const WHY_JOIN_RE =
    /\b(why\s+(would|do)\s+you\s+(want|like)\s+to\s+(join|work(\s+at|\s+for)?)|why\s+(this|our)\s+company|why\s+are\s+you\s+interested\s+in)\b/i;
  const WHY_JOIN_NEG_RE = /\b(why\s+did\s+you\s+leave|reason\s+for\s+leaving|gap|quit)\b/i;

  const SALARY_EXPECTATIONS_RE =
    /\b(salary\s*expectations?|expected\s*(salary|compensation|pay)|desired\s*(salary|compensation|pay)|compensation\s*expectations?|pay\s*expectations?)\b/i;
  const SALARY_NEG_RE =
    /\b(salary\s*history|current\s*salary|previous\s*salary|prior\s*salary|salary\s*last|last\s*salary|past\s*salary)\b/i;

  const UK_RE = /\b(uk|u\.k\.|united\s*kingdom|great\s*britain|britain|england)\b/i;
  const RIGHT_TO_WORK_RE =
    /\b(right\s*to\s*work|eligible\s*to\s*work|work\s*(authorization|authorisation)|work\s*permit|legal\s*right\s*to\s*work)\b/i;
  const RIGHT_TO_WORK_NEG_RE =
    /\b(sponsorship|visa\s*sponsorship|require\s*sponsorship|need\s*sponsorship|work\s*in\s*the\s*us|united\s*states)\b/i;

  const NOTICE_PERIOD_RE =
    /\b(notice\s*period|availability|available\s+to\s+start|when\s+can\s+you\s+start|how\s+soon\s+can\s+you\s+start|earliest\s+start|start\s+date|start\s+work)\b/i;
  const NOTICE_PERIOD_NEG_RE =
    /\b(project\s*start|course\s*start|start\s*time|start\s*salary)\b/i;

  const YEARS_RE = /\b(years?|yrs?)\b/i;
  const EXPERIENCE_RE = /\b(experience|exp)\b/i;
  const USER_RESEARCH_RE =
    /\b(user\s*research|ux\s*research|user\s*researcher|uxr|research\s*stud(y|ies)|usability\s*research)\b/i;
  const USER_RESEARCH_YEARS_NEG_RE =
    /\b(competitive\s*research|market\s*research|seo|developer|coding|javascript|react|vue|design)\b/i;

  const STARTUP_RE =
    /\b(start\s*[- ]?\s*up|startup|startups|early[- ]?stage|seed|series\s*[a-d]|founder|venture[- ]?backed)\b/i;
  const STARTUP_YEARS_NEG_RE =
    /\b(start\s*date|start\s*time|how\s+soon\s+can\s+you\s+start|available\s+to\s+start|notice\s*period)\b/i;

  const LONDON_TRAVEL_RE =
    /\b(based\s+in\s+london|in\s+london|london\s+based|regularly\s+travel|able\s+to\s+travel|willing\s+to\s+travel|commute|able\s+to\s+commute|travel\s+to|commute\s+to|post\s*code|postcode)\b/i;
  const LONDON_TRAVEL_NEG_RE =
    /\b(relocate|relocation|remote\s+only|fully\s+remote|visa|sponsorship)\b/i;

  const COMPANY_VALUES_RE =
    /\b(company\s+values?|values)\b/i;
  const VALUES_QUESTION_RE =
    /\b(drawn\s+to\s+the\s+most|drawn\s+to|bring\s+it\s+to\s+life|bring\s+them?\s+to\s+life|how\s+will\s+you\s+bring|which\s+one\s+are\s+you\s+drawn)\b/i;

  const FULLNAME_RE = /\b(full\s*name|your\s*name|name\s*on\s*card)\b/i;
  const FIRST_AND_LAST_RE =
    /\b(first\s*(and|&)\s*last\s*name|first\s*&\s*last|first\s+last\s+name)\b/i;
  const FIRSTNAME_RE = /\b(first\s*name|given\s*name|forename)\b/i;
  const LASTNAME_RE = /\b(last\s*name|family\s*name|surname)\b/i;
  const NAME_RE = /\bname\b/i;
  const NAME_NEG_RE =
    /\b(user\s*name|username|login|handle|nickname|screen\s*name|account\s*name)\b/i;

  const ADDRESS_RE =
    /\b(address|street|street\s*address|streetaddress|addr|address\s*line|addressline|address1|address_?1|address2|address_?2)\b/i;
  const ADDRESS_NEG_RE =
    /\b(ip\s*address|mac\s*address|email\s*address|zip|zipcode|postal|post\s*code|postcode|city|town|state|province|region|country)\b/i;

  let cachedProfile = null;
  let fillTimer = null;
  let observer = null;
  const aiAttempted = new WeakSet();

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

  function hasAnyData(profile) {
    if (!profile) return false;
    return Boolean(
      String(profile.fullName || "").trim() ||
        String(profile.email || "").trim() ||
        String(profile.phone || "").trim() ||
        String(profile.linkedin || "").trim() ||
        String(profile.address || "").trim() ||
        String(profile.whyJoin || "").trim() ||
        String(profile.salaryExpectations || "").trim() ||
        String(profile.rightToWorkUK || "").trim() ||
        String(profile.rightToWorkUKText || "").trim() ||
        String(profile.noticePeriod || "").trim() ||
        String(profile.userResearchYears || "").trim() ||
        String(profile.londonTravel || "").trim() ||
        String(profile.startupExperienceYears || "").trim()
    );
  }

  function inferUkPostcodeFromSignal(signal) {
    const s = String(signal || "").replace(/\s+/g, " ").trim();
    if (!s) return "";

    // UK postcode (common pattern, tolerant of spacing)
    const m =
      s.match(/\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i) ||
      null;
    if (!m) return "";
    return `${String(m[1]).toUpperCase()} ${String(m[2]).toUpperCase()}`.trim();
  }

  function renderPostcodeTemplate(template, postcode) {
    const t = String(template || "");
    if (!t.trim()) return "";
    const pc = String(postcode || "").trim() || "<post code>";
    return t.replace(/<\s*post\s*code\s*>/gi, pc).replace(/<\s*postcode\s*>/gi, pc);
  }

  function normalizeYesNo(v) {
    const s = String(v || "").trim().toLowerCase();
    if (!s) return "";
    if (["yes", "y", "true", "1"].includes(s)) return "yes";
    if (["no", "n", "false", "0"].includes(s)) return "no";
    return s;
  }

  function getOptionText(option) {
    try {
      return collapseText(option.textContent || "");
    } catch {
      return "";
    }
  }

  function setNativeChecked(el, checked) {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "checked");
    if (desc && typeof desc.set === "function") desc.set.call(el, checked);
    else el.checked = checked;
  }

  function fillRightToWorkControl(el, profile) {
    const yesNo = normalizeYesNo(profile.rightToWorkUK);
    const textAnswer = String(profile.rightToWorkUKText || "").trim();

    const signal = buildSignal(el);
    const kindMatches =
      UK_RE.test(signal) && RIGHT_TO_WORK_RE.test(signal) && !RIGHT_TO_WORK_NEG_RE.test(signal);
    if (!kindMatches) return false;

    // Select
    if (el instanceof HTMLSelectElement) {
      if (yesNo !== "yes" && yesNo !== "no") return false;
      // Don't override if already chosen.
      if (String(el.value || "").trim()) return false;

      const wantYes = yesNo === "yes";
      let best = null;
      for (const opt of Array.from(el.options || [])) {
        const val = String(opt.value || "").trim().toLowerCase();
        const txt = getOptionText(opt).toLowerCase();
        if (!val && !txt) continue;
        if (wantYes && (/^y(es)?$/.test(val) || /\byes\b/.test(txt))) best = opt;
        if (!wantYes && (/^n(o)?$/.test(val) || /\bno\b/.test(txt))) best = opt;
      }

      if (!best) return false;
      try {
        el.value = best.value;
      } catch {
        // ignore
      }
      dispatchFrameworkEvents(el, { valueForInputEvent: el.value });
      return true;
    }

    // Radio
    if (el instanceof HTMLInputElement && el.type === "radio") {
      if (yesNo !== "yes" && yesNo !== "no") return false;
      const name = String(el.getAttribute("name") || el.name || "").trim();
      if (!name) return false;

      const scope = el.form || el.closest("fieldset") || document;
      const radios = Array.from(scope.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`));
      if (radios.some((r) => r.checked)) return false;

      const wantYes = yesNo === "yes";
      const yesRe = /\b(yes|i\s*do|y)\b/i;
      const noRe = /\b(no|i\s*do\s*not|n)\b/i;
      const targetRe = wantYes ? yesRe : noRe;

      for (const r of radios) {
        const rSignal = buildSignal(r);
        if (targetRe.test(rSignal)) {
          setNativeChecked(r, true);
          dispatchFrameworkEvents(r, { valueForInputEvent: r.value });
          return true;
        }
      }
      return false;
    }

    // Checkbox (best-effort, only if it looks like a single confirmation box)
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      if (el.checked) return false; // don't override
      if (yesNo !== "yes") return false;
      setNativeChecked(el, true);
      dispatchFrameworkEvents(el, { valueForInputEvent: "true" });
      return true;
    }

    // Fallback: some sites use a free-text input for this question.
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLElement &&
        ((el.getAttribute("role") || "").toLowerCase() === "textbox" ||
          (el.getAttribute("contenteditable") || "").toLowerCase() === "true" ||
          el.isContentEditable))
    ) {
      if (!isEmptyValue(el)) return false;
      const v =
        textAnswer || (yesNo === "yes" ? "Yes" : yesNo === "no" ? "No" : "");
      if (!v) return false;
      setEditableValue(el, v);
      dispatchFrameworkEvents(el, { valueForInputEvent: v });
      return true;
    }

    return false;
  }

  function inferCompanyNameFromSignal(signal) {
    const s = String(signal || "").replace(/\s+/g, " ").trim();
    if (!s) return "";

    // e.g. "Why would you like to join Acme?" → "Acme"
    const m =
      s.match(/\bjoin\s+([A-Za-z0-9][A-Za-z0-9&.,'’\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9&.,'’\-]*){0,5})\b/i) ||
      s.match(/\bwork\s+(?:at|for)\s+([A-Za-z0-9][A-Za-z0-9&.,'’\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9&.,'’\-]*){0,5})\b/i) ||
      null;
    if (!m) return "";

    const candidate = String(m[1] || "")
      .trim()
      .replace(/[?!.:,;]+$/g, "")
      .trim();
    if (!candidate) return "";

    // Avoid obvious non-company captures.
    if (/^(us|our\s+team|this\s+role|this\s+position|the\s+company)$/i.test(candidate)) return "";

    return candidate;
  }

  function renderCompanyTemplate(template, companyName) {
    const t = String(template || "");
    if (!t.trim()) return "";
    const c = String(companyName || "").trim() || "your company";
    return t
      .replace(/<\s*company\s*name\s*>/gi, c)
      .replace(/\{\{\s*company\s*\}\}/gi, c);
  }

  function splitName(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return { first: "", last: "" };
    if (parts.length === 1) return { first: parts[0], last: "" };
    return { first: parts[0], last: parts.slice(1).join(" ") };
  }

  async function refreshProfileFromStorage() {
    const { [STORAGE_KEY]: stored } = await browser.storage.local.get({
      [STORAGE_KEY]: DEFAULT_PROFILE
    });
    cachedProfile = normalizeProfile(stored);
  }

  async function getAiEnabled() {
    try {
      const { [AI_SETTINGS_KEY]: stored } = await browser.storage.local.get({
        [AI_SETTINGS_KEY]: { enabled: false }
      });
      return Boolean(stored && stored.enabled);
    } catch {
      return false;
    }
  }

  function isVisible(el) {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      const rect = el.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;
      return true;
    } catch {
      return true;
    }
  }

  function shouldConsiderElement(el) {
    const isNative =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement;
    const isEditableBox =
      !isNative &&
      el instanceof HTMLElement &&
      ((el.getAttribute("role") || "").toLowerCase() === "textbox" ||
        (el.getAttribute("contenteditable") || "").toLowerCase() === "true" ||
        el.isContentEditable);

    if (!isNative && !isEditableBox) return false;

    if (isNative) {
      if (el.disabled || el.readOnly) return false;
    } else {
      const ariaDisabled = (el.getAttribute("aria-disabled") || "").toLowerCase();
      if (ariaDisabled === "true") return false;
      const ce = (el.getAttribute("contenteditable") || "").toLowerCase();
      if (ce === "false") return false;
    }

    if (!isVisible(el)) return false;

    if (el instanceof HTMLInputElement) {
      const t = String(el.getAttribute("type") || el.type || "text").toLowerCase();
      const blocked = new Set([
        "hidden",
        "submit",
        "button",
        "reset",
        "image",
        "checkbox",
        "radio",
        "file",
        "password",
        "color",
        "range",
        "date",
        "datetime-local",
        "month",
        "week",
        "time"
      ]);
      if (blocked.has(t)) return false;
    }
    return true;
  }

  function getAriaLabelledbyText(el) {
    const ids = String(el.getAttribute("aria-labelledby") || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (ids.length === 0) return "";
    const chunks = [];
    for (const id of ids) {
      const ref = document.getElementById(id);
      if (ref && typeof ref.textContent === "string") chunks.push(ref.textContent);
    }
    return chunks.join(" ").trim();
  }

  function getLabelText(el) {
    const chunks = [];

    if (el.labels && el.labels.length) {
      for (const lab of el.labels) {
        if (lab && typeof lab.textContent === "string") chunks.push(lab.textContent);
      }
      return chunks.join(" ").trim();
    }

    const id = el.getAttribute("id");
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lab && typeof lab.textContent === "string") return lab.textContent.trim();
    }

    // Fallback: common patterns (label wraps input)
    let p = el.parentElement;
    for (let i = 0; i < 4 && p; i++) {
      if (p.tagName && p.tagName.toLowerCase() === "label") {
        if (typeof p.textContent === "string") return p.textContent.trim();
        break;
      }
      p = p.parentElement;
    }

    return chunks.join(" ").trim();
  }

  function collapseText(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function textFromNode(node) {
    if (!node) return "";
    return collapseText(node.textContent || "").slice(0, 400);
  }

  function countFormControls(container) {
    if (!container) return 0;
    try {
      return container.querySelectorAll(
        "input, textarea, select, [role='textbox'], [contenteditable='true'], [contenteditable='']"
      ).length;
    } catch {
      return 0;
    }
  }

  // Many job application forms render the "question" as plain text near the field
  // without wiring it up to a <label>/<aria-label>. Grab nearby prompt text as
  // an additional signal for classification.
  function getNearbyPromptText(el) {
    const texts = [];
    const add = (node) => {
      const t = textFromNode(node);
      if (t) texts.push(t);
    };

    const parent = el.parentElement;
    if (!parent) return "";

    // Previous siblings often contain the prompt/question.
    let sib = el.previousElementSibling;
    for (let i = 0; i < 3 && sib; i++) {
      // Stop if we crossed into another field's container.
      if (
        sib.querySelector &&
        sib.querySelector(
          "input, textarea, select, [role='textbox'], [contenteditable='true'], [contenteditable='']"
        )
      ) {
        break;
      }
      add(sib);
      sib = sib.previousElementSibling;
    }

    // If the label/prompt is placed as a sibling of the parent (common in grid layouts),
    // collect from parent's previous siblings too.
    let ps = parent.previousElementSibling;
    for (let i = 0; i < 2 && ps; i++) {
      if (
        ps.querySelector &&
        ps.querySelector(
          "input, textarea, select, [role='textbox'], [contenteditable='true'], [contenteditable='']"
        )
      ) {
        break;
      }
      add(ps);
      ps = ps.previousElementSibling;
    }

    // Finally, pick prompt nodes only from a "field container" that likely belongs to this control
    // (i.e. a container with <= 1 form control).
    let fieldContainer = parent;
    for (let depth = 0; depth < 5 && fieldContainer; depth++) {
      if (countFormControls(fieldContainer) <= 1) break;
      fieldContainer = fieldContainer.parentElement;
    }

    const promptHintRe =
      /(\bwhy\b|\bjoin\b|\bcompany\b|\?|\bsalary\b|\bcompensation\b|\bpay\b|\bexpected\b|\bdesired\b|\blondon\b|\btravel\b|\bcommute\b|\bpost\s*code\b|\bpostcode\b|\bstart\s*[- ]?\s*up\b|\bstartup\b|\bearly[- ]?stage\b|\bfounder\b|\bvalues?\b)/i;

    if (fieldContainer) {
      const promptNodes = fieldContainer.querySelectorAll(
        "label, legend, p, span, h1, h2, h3, h4, h5, .label, .field-label, .question, .prompt, [role='heading']"
      );
      let picked = 0;
      for (const n of promptNodes) {
        if (picked >= 4) break;
        if (n === el || n.contains(el)) continue;
        // Only consider nodes that appear before the field in DOM order.
        try {
          const pos = n.compareDocumentPosition(el);
          if (!(pos & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
        } catch {
          // ignore
        }
        const t = textFromNode(n);
        if (!t) continue;
        if (promptHintRe.test(t)) {
          texts.push(t);
          picked++;
        }
      }
    }

    // Fieldset legends frequently hold the question.
    const fs = el.closest("fieldset");
    if (fs) {
      const legend = fs.querySelector("legend");
      add(legend);
    }

    return collapseText(texts.join(" ")).slice(0, 800);
  }

  function buildSignal(el) {
    const parts = [];
    const push = (v) => {
      if (typeof v !== "string") return;
      const s = v.trim();
      if (s) parts.push(s);
    };

    push(el.getAttribute("id") || "");
    push(el.getAttribute("name") || "");
    push(el.getAttribute("placeholder") || "");
    push(el.getAttribute("aria-label") || "");
    push(getAriaLabelledbyText(el));
    push(getLabelText(el));
    push(getNearbyPromptText(el));
    push(el.getAttribute("autocomplete") || "");

    for (const a of ["data-testid", "data-test", "data-qa", "data-cy"]) {
      push(el.getAttribute(a) || "");
    }

    // Keep it bounded to avoid pathological huge strings.
    return parts.join(" ").replace(/\s+/g, " ").slice(0, 2048);
  }

  function inferCompanyNameLoose(signal) {
    const s = String(signal || "").replace(/\s+/g, " ").trim();
    if (!s) return "";
    const m =
      s.match(/\b(at|for|join)\s+([A-Za-z0-9][A-Za-z0-9&.,'’\-]*(?:\s+[A-Za-z0-9][A-Za-z0-9&.,'’\-]*){0,5})\b/i) ||
      null;
    if (!m) return "";
    const candidate = String(m[2] || "")
      .trim()
      .replace(/[?!.:,;]+$/g, "")
      .trim();
    if (!candidate) return "";
    if (/^(us|our\s+team|this\s+role|this\s+position|the\s+company)$/i.test(candidate)) return "";
    return candidate;
  }

  function extractValuesContext(el) {
    // Best-effort: capture nearby "values" section text without grabbing the whole page.
    const limit = 1400;
    let n = el instanceof Element ? el : null;
    for (let depth = 0; depth < 8 && n; depth++) {
      const container =
        n.closest?.("section, article, main, form, fieldset, div") || n.parentElement;
      if (!container) break;
      const txt = collapseText(container.textContent || "");
      if (COMPANY_VALUES_RE.test(txt) && txt.length > 40) return txt.slice(0, limit);
      n = container.parentElement;
    }
    return "";
  }

  async function maybeFillValuesWithAI(el, signal) {
    if (aiAttempted.has(el)) return false;
    if (!isEmptyValue(el)) return false;

    const enabled = await getAiEnabled();
    if (!enabled) return false;

    const question = collapseText(getLabelText(el) || getNearbyPromptText(el) || signal).slice(0, 600);
    const company = inferCompanyNameLoose(question) || inferCompanyNameLoose(signal);
    const context = extractValuesContext(el);

    aiAttempted.add(el);
    const result = await browser.runtime
      .sendMessage({
        type: "AI_GENERATE_VALUES_ANSWER",
        company,
        question,
        context
      })
      .catch(() => null);

    const answer = result && result.ok && typeof result.answer === "string" ? result.answer : "";
    if (!answer.trim()) return false;
    if (!isEmptyValue(el)) return false; // user typed while waiting

    setEditableValue(el, answer.trim());
    dispatchFrameworkEvents(el, { valueForInputEvent: answer.trim() });
    return true;
  }

  function detectFieldKind(el, signal) {
    const ac = String(el.getAttribute("autocomplete") || "").toLowerCase();
    if (ac) {
      if (ac.includes("email")) return "email";
      if (ac.includes("tel")) return "phone";
      if (ac.includes("given-name")) return "firstName";
      if (ac.includes("family-name")) return "lastName";
      if (ac === "name" || ac.endsWith(" name") || ac.includes("name ")) return "fullName";
      if (
        ac.includes("street-address") ||
        ac.includes("address-line1") ||
        ac.includes("address-line2")
      ) {
        return "address";
      }
    }

    if (el instanceof HTMLInputElement) {
      const type = String(el.type || "").toLowerCase();
      if (type === "email") return "email";
      if (type === "tel") return "phone";
    }

    if (WHY_JOIN_RE.test(signal) && !WHY_JOIN_NEG_RE.test(signal)) return "whyJoin";
    if (COMPANY_VALUES_RE.test(signal) && VALUES_QUESTION_RE.test(signal)) return "aiCompanyValues";
    if (SALARY_EXPECTATIONS_RE.test(signal) && !SALARY_NEG_RE.test(signal)) {
      return "salaryExpectations";
    }
    if (NOTICE_PERIOD_RE.test(signal) && !NOTICE_PERIOD_NEG_RE.test(signal)) {
      return "noticePeriod";
    }
    if (
      USER_RESEARCH_RE.test(signal) &&
      !USER_RESEARCH_YEARS_NEG_RE.test(signal) &&
      (YEARS_RE.test(signal) || EXPERIENCE_RE.test(signal))
    ) {
      return "userResearchYears";
    }
    if (
      STARTUP_RE.test(signal) &&
      !STARTUP_YEARS_NEG_RE.test(signal) &&
      (YEARS_RE.test(signal) || EXPERIENCE_RE.test(signal))
    ) {
      return "startupExperienceYears";
    }
    if (LONDON_TRAVEL_RE.test(signal) && !LONDON_TRAVEL_NEG_RE.test(signal)) {
      return "londonTravel";
    }
    if (UK_RE.test(signal) && RIGHT_TO_WORK_RE.test(signal) && !RIGHT_TO_WORK_NEG_RE.test(signal)) {
      return "rightToWorkUK";
    }
    if (PHONE_RE.test(signal) && !PHONE_NEG_RE.test(signal)) return "phone";
    if (LINKEDIN_RE.test(signal)) return "linkedin";
    if (EMAIL_RE.test(signal) && !EMAIL_NEG_RE.test(signal)) return "email";
    if (ADDRESS_RE.test(signal) && !ADDRESS_NEG_RE.test(signal)) return "address";

    if (NAME_NEG_RE.test(signal)) return null;
    if (FIRST_AND_LAST_RE.test(signal)) return "fullName";
    if (FIRSTNAME_RE.test(signal) && LASTNAME_RE.test(signal)) return "fullName";
    if (FIRSTNAME_RE.test(signal)) return "firstName";
    if (LASTNAME_RE.test(signal)) return "lastName";
    if (FULLNAME_RE.test(signal)) return "fullName";

    // Very broad fallback: only consider plain "name" if it doesn't look like username/login.
    if (NAME_RE.test(signal)) return "fullName";

    return null;
  }

  function getCurrentValue(el) {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      return String(el.value || "");
    }
    if (el instanceof HTMLElement) {
      return String(el.textContent || "");
    }
    return "";
  }

  function isEmptyValue(el) {
    return !getCurrentValue(el).trim();
  }

  function setNativeValue(el, value) {
    const isTextArea = el instanceof HTMLTextAreaElement;
    const proto = isTextArea
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && typeof desc.set === "function") desc.set.call(el, value);
    else el.value = value;
  }

  function dispatchFrameworkEvents(el, { valueForInputEvent = "" } = {}) {
    // Some frameworks react better if the element is focused.
    try {
      if (typeof el.focus === "function") el.focus({ preventScroll: true });
    } catch {
      try {
        if (typeof el.focus === "function") el.focus();
      } catch {
        // ignore
      }
    }

    // Prefer a real InputEvent when supported.
    try {
      if (typeof window.InputEvent === "function") {
        el.dispatchEvent(
          new InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: valueForInputEvent || null,
            inputType: "insertText"
          })
        );
      }
    } catch {
      // ignore
    }

    // Always dispatch standard events as well.
    try {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    } catch {
      // ignore
    }

    // Some forms validate on blur.
    try {
      if (typeof el.blur === "function") el.blur();
    } catch {
      // ignore
    }
  }

  function setEditableValue(el, value) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      setNativeValue(el, value);
      return;
    }
    if (el instanceof HTMLSelectElement) {
      // Prefer selecting an existing option rather than forcing a value.
      const desired = String(value || "").trim().toLowerCase();
      if (!desired) return;
      let best = null;
      for (const opt of Array.from(el.options || [])) {
        const ov = String(opt.value || "").trim().toLowerCase();
        const ot = collapseText(opt.textContent || "").toLowerCase();
        if (!ov && !ot) continue;
        if (ov === desired || ot === desired) {
          best = opt;
          break;
        }
        if (!best && (ot.includes(desired) || ov.includes(desired))) best = opt;
      }
      if (!best) return;
      try {
        el.value = best.value;
      } catch {
        // ignore
      }
      return;
    }
    if (el instanceof HTMLElement) {
      el.textContent = value;
      return;
    }
  }

  function fillElement(el, kind, profile) {
    if (!shouldConsiderElement(el)) return false;
    if (!isEmptyValue(el)) return false;

    const nameParts = splitName(profile.fullName);
    let value = "";

    switch (kind) {
      case "whyJoin": {
        const template = String(profile.whyJoin || "").trim();
        if (!template) break;
        const signal = buildSignal(el);
        const company = inferCompanyNameFromSignal(signal);
        value = renderCompanyTemplate(template, company).trim();
        break;
      }
      case "salaryExpectations":
        value = String(profile.salaryExpectations || "").trim();
        break;
      case "noticePeriod":
        value = String(profile.noticePeriod || "").trim();
        break;
      case "userResearchYears":
        value = String(profile.userResearchYears || "").trim();
        break;
      case "startupExperienceYears":
        value = String(profile.startupExperienceYears || "").trim();
        break;
      case "londonTravel": {
        const template = String(profile.londonTravel || "").trim();
        if (!template) break;
        const signal = buildSignal(el);
        const pc = inferUkPostcodeFromSignal(signal);
        value = renderPostcodeTemplate(template, pc).trim();
        break;
      }
      case "rightToWorkUK":
        value = normalizeYesNo(profile.rightToWorkUK) === "yes" ? "Yes" : "No";
        break;
      case "email":
        value = String(profile.email || "").trim();
        break;
      case "phone":
        value = String(profile.phone || "").trim();
        break;
      case "linkedin":
        value = String(profile.linkedin || "").trim();
        break;
      case "fullName":
        value = String(profile.fullName || "").trim();
        break;
      case "firstName":
        value = String(nameParts.first || "").trim();
        break;
      case "lastName":
        value = String(nameParts.last || "").trim();
        break;
      case "address":
        value = String(profile.address || "").trim();
        break;
      default:
        return false;
    }

    if (!value) return false;

    try {
      setEditableValue(el, value);
      dispatchFrameworkEvents(el, { valueForInputEvent: value });
      return true;
    } catch {
      try {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.value = value;
        } else if (el instanceof HTMLElement) {
          el.textContent = value;
        }
        dispatchFrameworkEvents(el, { valueForInputEvent: value });
        return true;
      } catch {
        return false;
      }
    }
  }

  function scanAndFill(root = document) {
    const profile = cachedProfile;
    if (!hasAnyData(profile)) return;

    const fields = root.querySelectorAll(
      "input, textarea, select, [contenteditable='true'], [contenteditable=''], [role='textbox']"
    );
    for (const el of fields) {
      if (!shouldConsiderElement(el)) continue;
      const signal = buildSignal(el);
      const kind = detectFieldKind(el, signal);
      if (!kind) continue;
      if (kind === "rightToWorkUK") {
        // This question can be rendered as free-text inputs too.
        fillRightToWorkControl(el, profile);
        continue;
      }
      if (kind === "aiCompanyValues") {
        // async; do not block scanning
        void maybeFillValuesWithAI(el, signal);
        continue;
      }
      fillElement(el, kind, profile);
    }

    const ynControls = root.querySelectorAll("select, input[type='radio'], input[type='checkbox']");
    for (const el of ynControls) {
      try {
        fillRightToWorkControl(el, profile);
      } catch {
        // ignore
      }
    }
  }

  function scheduleFill() {
    if (fillTimer) window.clearTimeout(fillTimer);
    fillTimer = window.setTimeout(() => {
      fillTimer = null;
      scanAndFill(document);
    }, 250);
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          scheduleFill();
          return;
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function hookHistory() {
    try {
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      if (typeof origPush === "function") {
        history.pushState = function (...args) {
          const ret = origPush.apply(this, args);
          scheduleFill();
          return ret;
        };
      }
      if (typeof origReplace === "function") {
        history.replaceState = function (...args) {
          const ret = origReplace.apply(this, args);
          scheduleFill();
          return ret;
        };
      }
    } catch {
      // ignore
    }
  }

  async function init() {
    await refreshProfileFromStorage();
    scheduleFill();
    startObserver();
    hookHistory();

    window.addEventListener("pageshow", scheduleFill, true);
    window.addEventListener("popstate", scheduleFill, true);
    window.addEventListener("hashchange", scheduleFill, true);

    try {
      browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;
        if (!changes || !Object.prototype.hasOwnProperty.call(changes, STORAGE_KEY)) return;
        cachedProfile = normalizeProfile(changes[STORAGE_KEY].newValue);
        scheduleFill();
      });
    } catch {
      // ignore
    }
  }

  init().catch(() => {
    // Fail closed: do nothing
  });
})();
