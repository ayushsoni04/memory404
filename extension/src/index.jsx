import React, { useEffect, useMemo, useRef, useState } from "react";
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

async function saveCurrentTab(apiBase) {
  const tab = await getActiveTab();
  if (!tab?.id || !tab.url) throw new Error("No active tab found");

  const meta = await extractPageMeta(tab.id);
  const payload = {
    url: tab.url,
    title: meta.title ?? tab.title ?? tab.url,
    description: meta.description ?? null,
    imageUrl: meta.imageUrl ?? null,
  };

  const res = await fetch(`${apiBase}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return { linkId: data.link?.id, groupId: data.link?.groupId ?? null };
  }
  if (res.status === 409 && (data.existingId || data.link?.id)) {
    return {
      linkId: data.link?.id ?? data.existingId,
      groupId: data.link?.groupId ?? null,
    };
  }
  throw new Error(data?.error || "Failed to save");
}

async function fetchGroups(apiBase) {
  const res = await fetch(`${apiBase}/api/groups`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to load groups");
  return Array.isArray(data.groups) ? data.groups : [];
}

async function createGroup(apiBase, name) {
  const res = await fetch(`${apiBase}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to create group");
  return data.group;
}

async function moveLinkToGroup(apiBase, linkId, groupId) {
  const res = await fetch(`${apiBase}/api/links/${linkId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Failed to move link");
  return data.link;
}

function AppIcon() {
  return (
    <span className="app-icon" aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState("saving");
  const [linkId, setLinkId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupQuery, setGroupQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignNote, setAssignNote] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    chrome.storage.local.get(["apiBase"], (res) => {
      const saved = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      if (saved) setApiBase(saved);
    });
  }, []);

  useEffect(() => {
    const base = apiBase.trim();
    if (!base) return;
    chrome.storage.local.set({ apiBase: base });

    let cancelled = false;
    (async () => {
      setPhase("saving");
      setError("");
      try {
        const [saved, loadedGroups] = await Promise.all([
          saveCurrentTab(base),
          fetchGroups(base).catch(() => []),
        ]);
        if (cancelled) return;
        setLinkId(saved.linkId);
        setCurrentGroupId(saved.groupId);
        setGroups(loadedGroups);
        setPhase("saved");
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const filteredGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupQuery]);

  const exactMatch = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return null;
    return groups.find((g) => g.name.toLowerCase() === q) ?? null;
  }, [groups, groupQuery]);

  const currentGroupName = useMemo(
    () => groups.find((g) => g.id === currentGroupId)?.name ?? null,
    [groups, currentGroupId],
  );

  const assignGroup = async (target) => {
    if (!linkId || !target || assigning) return;
    const base = apiBase.trim();
    if (!base) return;

    setAssigning(true);
    setAssignNote("");
    setError("");
    try {
      let groupId = target.id ?? null;
      let groupName = target.name ?? "";

      if (!groupId && target.name?.trim()) {
        const name = target.name.trim();
        const existing = groups.find((g) => g.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          groupId = existing.id;
          groupName = existing.name;
        } else {
          const created = await createGroup(base, name);
          groupId = created.id;
          groupName = created.name;
          setGroups((prev) =>
            [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      }

      if (!groupId) return;
      if (groupId === currentGroupId) {
        setGroupQuery("");
        setDropdownOpen(false);
        return;
      }

      await moveLinkToGroup(base, linkId, groupId);
      setCurrentGroupId(groupId);
      setGroupQuery("");
      setDropdownOpen(false);
      setAssignNote(`Added to ${groupName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to assign group");
    } finally {
      setAssigning(false);
    }
  };

  const onGroupKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (exactMatch) {
        void assignGroup(exactMatch);
      } else if (groupQuery.trim()) {
        void assignGroup({ name: groupQuery.trim() });
      }
      return;
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
      setGroupQuery("");
    }
  };

  if (showSettings) {
    return (
      <div className="wrap">
        <div className="panel">
          <div className="panel-head">
            <button type="button" className="ghost-btn" onClick={() => setShowSettings(false)}>
              ← Back
            </button>
          </div>
          <label className="field-label">App URL</label>
          <input
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:3000"
          />
          <p className="hint">Change this if your app runs on a different host.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="panel">
        <button
          type="button"
          className="settings-btn"
          aria-label="Settings"
          onClick={() => setShowSettings(true)}
        >
          ⚙
        </button>

        {phase === "saving" ? (
          <div className="saved-row">
            <AppIcon />
            <span className="saved-text">Saving…</span>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="saved-row error-row">
            <AppIcon />
            <span className="saved-text">{error || "Could not save link"}</span>
          </div>
        ) : null}

        {phase === "saved" ? (
          <>
            <div className="saved-row">
              <AppIcon />
              <span className="saved-text">Saved to Not a Bookmark</span>
            </div>

            <div className="group-section">
              <div className={`group-field ${dropdownOpen ? "open" : ""}`}>
                <input
                  ref={inputRef}
                  className="group-input"
                  value={groupQuery}
                  onChange={(e) => {
                    setGroupQuery(e.target.value);
                    setDropdownOpen(true);
                    setAssignNote("");
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  onBlur={() => {
                    setTimeout(() => setDropdownOpen(false), 120);
                  }}
                  onKeyDown={onGroupKeyDown}
                  placeholder="Add group"
                  disabled={assigning}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="chevron-btn"
                  aria-label="Show groups"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setDropdownOpen((v) => !v);
                    inputRef.current?.focus();
                  }}
                >
                  ▾
                </button>
              </div>

              {dropdownOpen && filteredGroups.length ? (
                <ul className="group-list" role="listbox">
                  {filteredGroups.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        className={`group-option ${g.id === currentGroupId ? "active" : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => void assignGroup(g)}
                      >
                        {g.name}
                        {g.id === currentGroupId ? <span className="check">✓</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              {dropdownOpen && groupQuery.trim() && !exactMatch ? (
                <button
                  type="button"
                  className="create-option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void assignGroup({ name: groupQuery.trim() })}
                >
                  Create “{groupQuery.trim()}”
                </button>
              ) : null}

              {currentGroupName && !groupQuery ? (
                <p className="current-group">In {currentGroupName}</p>
              ) : null}

              {assignNote ? <p className="assign-note">{assignNote}</p> : null}
              {error ? <p className="field-error">{error}</p> : null}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
