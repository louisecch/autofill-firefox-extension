(() => {
  "use strict";

  const AI_SETTINGS_KEY = "aiSettings";

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

  function renderTemplate(template, vars) {
    const t = String(template || "");
    const v = vars && typeof vars === "object" ? vars : {};
    return t
      .replace(/\{\{\s*company\s*\}\}/gi, String(v.company || ""))
      .replace(/\{\{\s*question\s*\}\}/gi, String(v.question || ""))
      .replace(/\{\{\s*context\s*\}\}/gi, String(v.context || ""));
  }

  async function getAiSettings() {
    const { [AI_SETTINGS_KEY]: stored } = await browser.storage.local.get({
      [AI_SETTINGS_KEY]: DEFAULT_AI_SETTINGS
    });
    return normalizeAiSettings(stored);
  }

  async function openaiChatCompletion({ apiKey, model, prompt }) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 260,
        messages: [
          {
            role: "system",
            content:
              "You write job application form responses. Be concise, specific, and truthful."
          },
          { role: "user", content: prompt }
        ]
      })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${txt.slice(0, 500)}`);
    }

    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return "";
    return content.trim();
  }

  browser.runtime.onMessage.addListener((msg) => {
    if (!msg || typeof msg !== "object") return undefined;

    if (msg.type === "AI_GENERATE_VALUES_ANSWER") {
      return (async () => {
        const settings = await getAiSettings();
        if (!settings.enabled) return { ok: false, error: "AI is disabled in Options." };
        if (settings.provider !== "openai") return { ok: false, error: "Unsupported provider." };
        if (!settings.openaiApiKey.trim()) return { ok: false, error: "Missing OpenAI API key." };

        const company = typeof msg.company === "string" ? msg.company : "";
        const question = typeof msg.question === "string" ? msg.question : "";
        const context = typeof msg.context === "string" ? msg.context : "";

        const prompt = renderTemplate(settings.valuesPromptTemplate, {
          company,
          question,
          context
        }).slice(0, 8000);

        const answer = await openaiChatCompletion({
          apiKey: settings.openaiApiKey.trim(),
          model: settings.openaiModel.trim() || "gpt-4o-mini",
          prompt
        });

        return { ok: true, answer };
      })().catch((err) => {
        console.error(err);
        return { ok: false, error: String(err?.message || err) };
      });
    }

    return undefined;
  });
})();

