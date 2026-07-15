import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { PixelWaveLoader } from "./PixelWaveLoader";
import "./styles.css";

const DEFAULT_API_BASE = "http://localhost:3000";

const PROGRESSIVE_MESSAGES = [
  { afterMs: 0, text: "Saving…" },
  { afterMs: 2500, text: "Still working…" },
  { afterMs: 5500, text: "Almost there…" },
  { afterMs: 10000, text: "Taking a bit longer…" },
  { afterMs: 16000, text: "Hang tight…" },
];

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

async function saveTab(apiBase, tab, groupId, isFirstGroupLink = false, groupName = null) {
  if (!tab?.url) return null;

  let meta = { title: null, description: null, imageUrl: null };
  if (tab.active) {
    try {
      meta = await extractPageMeta(tab.id);
    } catch (e) {
      console.warn("Failed to extract tab meta:", e);
    }
  }

  const payload = {
    url: tab.url,
    title: meta.title ?? tab.title ?? tab.url,
    description: meta.description ?? null,
    imageUrl: meta.imageUrl ?? null,
  };
  if (isFirstGroupLink && groupName) {
    payload.newGroupName = groupName;
  } else if (groupId) {
    payload.groupId = groupId;
  }

  const res = await fetch(`${apiBase}/api/links`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return data.link;
  }
  if (res.status === 409 && (data.existingId || data.link?.id)) {
    return data.link ?? { id: data.existingId, groupId: data.link?.groupId ?? groupId };
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

function useProgressiveMessage(active, initial = "Saving…") {
  const [message, setMessage] = useState(initial);

  useEffect(() => {
    if (!active) {
      setMessage(initial);
      return;
    }
    const started = Date.now();
    const tick = () => {
      const elapsed = Date.now() - started;
      let next = initial;
      for (const step of PROGRESSIVE_MESSAGES) {
        if (elapsed >= step.afterMs) {
          next = step.afterMs === 0 ? initial : step.text;
        }
      }
      setMessage(next);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, [active, initial]);

  return message;
}

function ProgressiveLoader({ active, label = "Saving…" }) {
  const message = useProgressiveMessage(active, label);
  return (
    <div className="saving-loader" role="status" aria-live="polite" aria-label={message}>
      <PixelWaveLoader width={88} label={message} />
      <span className="saved-text">{message}</span>
    </div>
  );
}

function App() {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [showSettings, setShowSettings] = useState(false);
  /** pick | saving | saved | error */
  const [phase, setPhase] = useState("pick");
  const [linkId, setLinkId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupQuery, setGroupQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState("");
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [highlightedTabs, setHighlightedTabs] = useState([]);
  const [activeTabGroup, setActiveTabGroup] = useState(null);
  const [saveMode, setSaveMode] = useState("active");
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const tabs = await chrome.tabs.query({ highlighted: true, currentWindow: true });
        setHighlightedTabs(tabs);

        const activeTab = tabs.find((t) => t.active) || tabs[0];
        if (chrome.tabGroups && activeTab && activeTab.groupId !== chrome.tabGroups.TAB_GROUP_ID_NONE) {
          const groupInfo = await chrome.tabGroups.get(activeTab.groupId);
          setActiveTabGroup(groupInfo);
        }
      } catch (e) {
        console.error("Failed to query tabs/groups:", e);
      }
    })();
  }, []);

  // Load storage states (apiBase, lastSavedGroupId, cachedGroups) exactly once on mount to prevent double loading
  useEffect(() => {
    chrome.storage.local.get(["apiBase", "lastSavedGroupId", "cachedGroups"], (res) => {
      const saved = typeof res.apiBase === "string" ? res.apiBase.trim() : "";
      if (saved) {
        setApiBase(saved);
      }
      
      if (Array.isArray(res.cachedGroups) && res.cachedGroups.length > 0) {
        setGroups(res.cachedGroups);
        const targetId = res.lastSavedGroupId;
        let defaultGroup = null;
        if (targetId) {
          defaultGroup = res.cachedGroups.find((g) => g.id === targetId) ?? null;
        }
        if (!defaultGroup) {
          defaultGroup =
            res.cachedGroups.find(
              (g) => g.name.trim().toLowerCase() === "uncategorized",
            ) ?? res.cachedGroups[0] ?? null;
        }
        if (defaultGroup) {
          setSelectedGroupId(defaultGroup.id);
          setGroupQuery(defaultGroup.name);
        }
        setGroupsLoading(false);
      }
      setIsStorageLoaded(true);
    });
  }, []);

  // Background fetch/sync groups once storage has loaded
  useEffect(() => {
    if (!isStorageLoaded) return;
    
    const base = apiBase.trim();
    if (!base) return;
    chrome.storage.local.set({ apiBase: base });

    let cancelled = false;
    (async () => {
      if (groups.length === 0) {
        setGroupsLoading(true);
      }
      setError("");
      setLinkId(null);
      setCurrentGroupId(null);
      try {
        const loadedGroups = await fetchGroups(base);
        if (cancelled) return;
        setGroups(loadedGroups);
        
        // Cache groups for next instant popup load
        chrome.storage.local.set({ cachedGroups: loadedGroups });

        // Select the group to remember
        chrome.storage.local.get(["lastSavedGroupId"], (res) => {
          if (cancelled) return;
          const targetId = res.lastSavedGroupId;
          let defaultGroup = null;
          if (targetId) {
            defaultGroup = loadedGroups.find((g) => g.id === targetId) ?? null;
          }
          if (!defaultGroup) {
            defaultGroup =
              loadedGroups.find(
                (g) => g.name.trim().toLowerCase() === "uncategorized",
              ) ?? loadedGroups[0] ?? null;
          }
          if (defaultGroup) {
            setSelectedGroupId(defaultGroup.id);
            setGroupQuery(defaultGroup.name);
          }
        });
        
        setTimeout(() => inputRef.current?.focus(), 50);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load groups");
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiBase, isStorageLoaded]);

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

  const resolveTargetGroup = async () => {
    const base = apiBase.trim();
    if (selectedGroupId) {
      const existing = groups.find((g) => g.id === selectedGroupId);
      if (existing) return existing;
    }
    if (exactMatch) return exactMatch;
    const name = groupQuery.trim();
    if (!name) throw new Error("Pick a group first");
    const created = await createGroup(base, name);
    setGroups((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
    );
    // Add new group to cachedGroups storage
    chrome.storage.local.get(["cachedGroups"], (res) => {
      const currentCache = Array.isArray(res.cachedGroups) ? res.cachedGroups : [];
      const updatedCache = [...currentCache, created].sort((a, b) => a.name.localeCompare(b.name));
      chrome.storage.local.set({ cachedGroups: updatedCache });
    });
    return created;
  };

  const handleSaveModeChange = (mode) => {
    setSaveMode(mode);
    if (mode === "group" && activeTabGroup && activeTabGroup.title) {
      const existingGroup = groups.find(
        (g) => g.name.toLowerCase() === activeTabGroup.title.trim().toLowerCase(),
      );
      if (existingGroup) {
        setSelectedGroupId(existingGroup.id);
        setGroupQuery(existingGroup.name);
      } else {
        setSelectedGroupId(null);
        setGroupQuery(activeTabGroup.title.trim());
      }
    } else if (mode === "active" || mode === "selected") {
      chrome.storage.local.get(["lastSavedGroupId", "cachedGroups"], (res) => {
        const targetId = res.lastSavedGroupId;
        const list = res.cachedGroups || groups;
        let defaultGroup = null;
        if (targetId) {
          defaultGroup = list.find((g) => g.id === targetId) ?? null;
        }
        if (!defaultGroup) {
          defaultGroup =
            list.find((g) => g.name.trim().toLowerCase() === "uncategorized") ??
            list[0] ??
            null;
        }
        if (defaultGroup) {
          setSelectedGroupId(defaultGroup.id);
          setGroupQuery(defaultGroup.name);
        }
      });
    }
  };

  const saveToSelectedGroup = async () => {
    const base = apiBase.trim();
    if (!base) return;
    setError("");
    setPhase("saving");
    try {
      const target = await resolveTargetGroup();

      let tabsToSave = [];
      if (saveMode === "active") {
        const activeTab = await getActiveTab();
        if (activeTab) tabsToSave = [activeTab];
      } else if (saveMode === "selected") {
        tabsToSave = highlightedTabs.length > 0
          ? highlightedTabs
          : [await getActiveTab()];
      } else if (saveMode === "group") {
        if (activeTabGroup) {
          const groupTabs = await chrome.tabs.query({ groupId: activeTabGroup.id });
          tabsToSave = groupTabs;
        } else {
          tabsToSave = [await getActiveTab()];
        }
      }

      tabsToSave = tabsToSave.filter((t) => t && t.url);
      if (tabsToSave.length === 0) {
        throw new Error("No tabs found to save");
      }

      let savedLink = null;
      for (const tab of tabsToSave) {
        const result = await saveTab(base, tab, target.id);
        if (tab.active || !savedLink) {
          savedLink = result;
        }
      }

      const finalGroupId = target.id;
      setLinkId(savedLink?.id || "multiple");
      setCurrentGroupId(finalGroupId);
      setSelectedGroupId(finalGroupId);
      setGroupQuery(target.name);
      setPhase("saved");
      setDropdownOpen(false);

      // Save lastSavedGroupId to chrome.storage.local to remember selection next time
      chrome.storage.local.set({ lastSavedGroupId: finalGroupId });
    } catch (e) {
      setPhase("pick");
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const pickGroup = (g) => {
    setSelectedGroupId(g.id);
    setGroupQuery(g.name);
    setDropdownOpen(false);
    setError("");
  };

  const onGroupKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (exactMatch) {
        pickGroup(exactMatch);
      } else if (groupQuery.trim()) {
        setSelectedGroupId(null);
        setDropdownOpen(false);
      }
      return;
    }
    if (e.key === "Escape") {
      setDropdownOpen(false);
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

        {phase === "saving" ? <ProgressiveLoader active label="Saving…" /> : null}

        {phase === "error" ? (
          <div className="saved-row error-row">
            <span className="saved-text">{error || "Could not save link"}</span>
          </div>
        ) : null}

        {phase === "pick" || phase === "saved" ? (
          <>
            <div className="saved-row">
              <span className="saved-text">
                {phase === "saved"
                  ? "Saved to memory404"
                  : "Choose a group, then save"}
              </span>
            </div>

            {phase === "pick" && (highlightedTabs.length > 1 || activeTabGroup) ? (
              <div className="save-mode-selector">
                <button
                  type="button"
                  className={`save-mode-btn ${saveMode === "active" ? "active" : ""}`}
                  onClick={() => handleSaveModeChange("active")}
                >
                  This Tab
                </button>
                {highlightedTabs.length > 1 ? (
                  <button
                    type="button"
                    className={`save-mode-btn ${saveMode === "selected" ? "active" : ""}`}
                    onClick={() => handleSaveModeChange("selected")}
                  >
                    Selected ({highlightedTabs.length})
                  </button>
                ) : null}
                {activeTabGroup ? (
                  <button
                    type="button"
                    className={`save-mode-btn ${saveMode === "group" ? "active" : ""}`}
                    onClick={() => handleSaveModeChange("group")}
                    title={`Group: ${activeTabGroup.title || "Unnamed"}`}
                  >
                    Group: {activeTabGroup.title || "Unnamed"}
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="group-section">
              {groupsLoading ? (
                <ProgressiveLoader active label="Loading groups…" />
              ) : (
                <>
                  <div className={`group-field ${dropdownOpen ? "open" : ""}`}>
                    <input
                      ref={inputRef}
                      className="group-input"
                      value={groupQuery}
                      onChange={(e) => {
                        setGroupQuery(e.target.value);
                        setSelectedGroupId(null);
                        setDropdownOpen(true);
                        setError("");
                      }}
                      onFocus={() => setDropdownOpen(true)}
                      onBlur={() => {
                        setTimeout(() => setDropdownOpen(false), 120);
                      }}
                      onKeyDown={onGroupKeyDown}
                      placeholder="Pick or create a group"
                      disabled={phase === "saved"}
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="chevron-btn"
                      aria-label="Show groups"
                      disabled={phase === "saved"}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setDropdownOpen((v) => !v);
                        inputRef.current?.focus();
                      }}
                    >
                      ▾
                    </button>
                  </div>

                  {phase === "pick" && dropdownOpen && filteredGroups.length ? (
                    <ul className="group-list" role="listbox">
                      {filteredGroups.map((g) => (
                        <li key={g.id}>
                          <button
                            type="button"
                            className={`group-option ${g.id === selectedGroupId ? "active" : ""}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickGroup(g)}
                          >
                            {g.name}
                            {g.id === selectedGroupId ? <span className="check">✓</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {phase === "pick" &&
                  dropdownOpen &&
                  groupQuery.trim() &&
                  !exactMatch ? (
                    <button
                      type="button"
                      className="create-option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setSelectedGroupId(null);
                        setDropdownOpen(false);
                      }}
                    >
                      Create “{groupQuery.trim()}”
                    </button>
                  ) : null}

                  {phase === "pick" ? (
                    <button
                      type="button"
                      className="save-btn"
                      disabled={!selectedGroupId && !groupQuery.trim()}
                      onClick={() => void saveToSelectedGroup()}
                    >
                      {saveMode === "active"
                        ? "Save tab to group"
                        : saveMode === "selected"
                        ? `Save ${highlightedTabs.length} tabs to group`
                        : "Save tab group"}
                    </button>
                  ) : null}

                  {phase === "saved" && currentGroupName ? (
                    <p className="current-group">In {currentGroupName}</p>
                  ) : null}

                  {phase === "saved" && linkId ? (
                    <p className="assign-note">
                      {saveMode === "active"
                        ? "Link saved"
                        : saveMode === "selected"
                        ? `${highlightedTabs.length} links saved`
                        : "Tab group saved"}
                    </p>
                  ) : null}

                  {error ? <p className="field-error">{error}</p> : null}
                </>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
