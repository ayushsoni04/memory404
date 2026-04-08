import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const DEFAULT_API_BASE = "http://localhost:3000";

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
}

async function extractPageMeta(tabId) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const text = (sel) => document.querySelector(sel)?.content?.trim() || null;
      const title =
        text('meta[property="og:title"]') ||
        text('meta[name="twitter:title"]') ||
        document.title ||
        null;
      const description =
        text('meta[property="og:description"]') ||
        text('meta[name="twitter:description"]') ||
        text('meta[name="description"]') ||
        null;
      const imageUrl =
        text('meta[property="og:image"]') ||
        text('meta[name="twitter:image"]') ||
        null;
      return { title, description, imageUrl };
    },
  });
  return result ?? { title: null, description: null, imageUrl: null };
}

function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [tabUrl, setTabUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [isErr, setIsErr] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["apiBase"], (res) => {
      const saved = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      if (saved) setApiBase(saved);
    });
  }, []);

  useEffect(() => {
    void getActiveTab().then((tab) => setTabUrl(tab?.url ?? ""));
  }, []);

  useEffect(() => {
    const base = apiBase.trim();
    if (!base) return;
    chrome.storage.local.set({ apiBase: base });
    fetch(`${base}/api/groups`)
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (!ok) throw new Error(d?.error || "Failed to load groups");
        const items = Array.isArray(d.groups) ? d.groups : [];
        setGroups(items);
        if (!groupId && items[0]?.id) setGroupId(items[0].id);
      })
      .catch(() => {
        setGroups([]);
      });
  }, [apiBase]);

  const canSave = useMemo(() => tabUrl && apiBase.trim(), [tabUrl, apiBase]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setStatus("");
    setIsErr(false);
    try {
      const tab = await getActiveTab();
      if (!tab?.id || !tab.url) throw new Error("No active tab found");

      const meta = await extractPageMeta(tab.id);
      const payload = {
        url: tab.url,
        title: meta.title ?? tab.title ?? tab.url,
        description: meta.description ?? null,
        imageUrl: meta.imageUrl ?? null,
        ...(newGroupName.trim()
          ? { newGroupName: newGroupName.trim() }
          : groupId
            ? { groupId }
            : {}),
      };

      const res = await fetch(`${apiBase.trim()}/api/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to save");
      setStatus("Saved to Linksavekren");
      setNewGroupName("");
    } catch (e) {
      setIsErr(true);
      setStatus(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="wrap">
      <div className="card">
        <h1 className="title">Linksavekren</h1>
        <p className="muted">Save current tab to your folders</p>
        <p className="url" title={tabUrl}>
          {tabUrl || "No active tab URL"}
        </p>
      </div>

      <div className="card">
        <label>App URL</label>
        <input
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          placeholder="http://localhost:3000"
        />

        <label>Save to existing group</label>
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <label>Or create new group</label>
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="e.g. Design"
        />

        <button className="primary" disabled={!canSave || saving} onClick={onSave}>
          {saving ? "Saving..." : "Save Current Tab"}
        </button>
        {status ? (
          <p className={`status status-pop ${isErr ? "err" : "ok"}`}>{status}</p>
        ) : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
