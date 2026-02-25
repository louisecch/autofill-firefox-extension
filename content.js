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
    updatedAt: null
  };

  const EMAIL_RE =
    /\b(e-?mail|email\s*address|emailaddress|contact\s*email|primary\s*email)\b/i;
  const EMAIL_NEG_RE = /\b(newsletter|subscribe|subscription)\b/i;

  const PHONE_RE = /\b(phone|mobile|cell|telephone|tel|contact\s*(no|num|number)|whatsapp)\b/i;
  const PHONE_NEG_RE = /\b(extension\s*(id|identifier)|telnet)\b/i;

  const LINKEDIN_RE = /\b(linked\s*in|linkedin)\b/i;

  const WHY_JOIN_RE =
    /\b(why\s+(would|do)\s+you\s+(want|like)\s+to\s+(join|work(\s+at|\s+for)?)|why\s+(this|our)\s+company|why\s+are\s+you\s+interested\s+in)\b/i;
  const WHY_JOIN_NEG_RE = /\b(why\s+did\s+you\s+leave|reason\s+for\s+leaving|gap|quit)\b/i;

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

  function normalizeProfile(raw) {
    const p = raw && typeof raw === "object" ? raw : {};
    return {
      fullName: typeof p.fullName === "string" ? p.fullName : "",
      email: typeof p.email === "string" ? p.email : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      linkedin: typeof p.linkedin === "string" ? p.linkedin : "",
      address: typeof p.address === "string" ? p.address : "",
      whyJoin: typeof p.whyJoin === "string" ? p.whyJoin : "",
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
        String(profile.whyJoin || "").trim()
    );
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
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (el.disabled || el.readOnly) return false;
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
    push(el.getAttribute("autocomplete") || "");

    for (const a of ["data-testid", "data-test", "data-qa", "data-cy"]) {
      push(el.getAttribute(a) || "");
    }

    // Keep it bounded to avoid pathological huge strings.
    return parts.join(" ").replace(/\s+/g, " ").slice(0, 2048);
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

  function isEmptyValue(el) {
    return !String(el.value || "").trim();
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

  function dispatchFrameworkEvents(el) {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
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
      setNativeValue(el, value);
      dispatchFrameworkEvents(el);
      return true;
    } catch {
      try {
        el.value = value;
        dispatchFrameworkEvents(el);
        return true;
      } catch {
        return false;
      }
    }
  }

  function scanAndFill(root = document) {
    const profile = cachedProfile;
    if (!hasAnyData(profile)) return;

    const fields = root.querySelectorAll("input, textarea");
    for (const el of fields) {
      if (!shouldConsiderElement(el)) continue;
      const signal = buildSignal(el);
      const kind = detectFieldKind(el, signal);
      if (!kind) continue;
      fillElement(el, kind, profile);
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
