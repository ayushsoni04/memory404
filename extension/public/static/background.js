const DEFAULT_API_BASE = "http://localhost:3000";

function getApiBase() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["apiBase"], (res) => {
      const base = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      resolve(base || DEFAULT_API_BASE);
    });
  });
}

function isLikelyUrl(text) {
  try {
    const u = new URL(text);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

async function saveUrlToApp(url) {
  const apiBase = await getApiBase();
  const res = await fetch(`${apiBase}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error || `Save failed (${res.status})`);
  }
  return apiBase;
}

chrome.omnibox.onInputStarted.addListener(() => {
  chrome.omnibox.setDefaultSuggestion({
    description:
      "Linksavekren: type a URL to <match>save & open</match>, or type <match>open</match>.",
  });
});

chrome.omnibox.onInputChanged.addListener((text, suggest) => {
  const t = text.trim();
  suggest([
    {
      content: t || "open",
      description: t
        ? `Save and open: <match>${t}</match>`
        : "Open Linksavekren app",
    },
    {
      content: "open",
      description: "Open Linksavekren app only",
    },
  ]);
});

chrome.omnibox.onInputEntered.addListener(async (text) => {
  const input = text.trim();
  const apiBase = await getApiBase();

  if (!input || input.toLowerCase() === "open") {
    await chrome.tabs.create({ url: apiBase });
    return;
  }

  if (isLikelyUrl(input)) {
    try {
      const base = await saveUrlToApp(input);
      await chrome.tabs.create({ url: base });
    } catch (e) {
      const msg =
        e instanceof Error ? encodeURIComponent(e.message) : "save_failed";
      await chrome.tabs.create({ url: `${apiBase}?error=${msg}` });
    }
    return;
  }

  // Fallback: open app if command isn't a URL
  await chrome.tabs.create({ url: apiBase });
});
