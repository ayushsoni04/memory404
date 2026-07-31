import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThinkingOrb } from "thinking-orbs";
import overlayCss from "./overlay-styles.css";

const ROOT_ID = "m404-save-root";
const DEFAULT_API_BASE = "http://localhost:3000";

const PROGRESSIVE_MESSAGES = [
  { afterMs: 0, text: "Saving…" },
  { afterMs: 2500, text: "Still working…" },
  { afterMs: 5500, text: "Almost there…" },
  { afterMs: 10000, text: "Taking a bit longer…" },
  { afterMs: 16000, text: "Hang tight…" },
];

function sendMessage(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(res ?? { ok: false, error: "No response" });
      });
    } catch (e) {
      resolve({
        ok: false,
        error: e instanceof Error ? e.message : "Message failed",
      });
    }
  });
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function displayGroupName(name) {
  if (!name) return name;
  const nameLower = name.trim().toLowerCase();
  if (nameLower === "general" || nameLower === "uncategorized") return "All";
  return name;
}

function pickDefaultGroup(groups, lastSavedGroupId) {
  let defaultGroup = null;
  if (lastSavedGroupId) {
    defaultGroup = groups.find((g) => g.id === lastSavedGroupId) ?? null;
  }
  if (!defaultGroup) {
    defaultGroup =
      groups.find((g) => {
        const nameLower = g.name.trim().toLowerCase();
        return nameLower === "general" || nameLower === "uncategorized";
      }) ??
      groups[0] ??
      null;
  }
  return defaultGroup;
}

function useProgressiveMessage(active, initial = "Saving…") {
  const [message, setMessage] = useState(initial);

  useEffect(() => {
    if (!active) return;
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
    const firstTick = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 400);
    return () => {
      window.clearTimeout(firstTick);
      window.clearInterval(id);
    };
  }, [active, initial]);

  return active ? message : initial;
}

function OrbStatus({ active, label = "Saving…", state = "searching" }) {
  const message = useProgressiveMessage(active, label);
  return (
    <div className="orb-status" role="status" aria-live="polite" aria-label={message}>
      <ThinkingOrb state={state} size={64} speed={0.95} theme="dark" />
      <span className="orb-status-text">{message}</span>
    </div>
  );
}

function applyJobToState(job, setters) {
  if (!job) return;
  const {
    setPhase,
    setError,
    setLinkId,
    setCurrentGroupId,
    setGroupQuery,
    setSelectedGroupId,
    setSaveMode,
    setSaveProgress,
  } = setters;

  const total = typeof job.total === "number" ? job.total : 0;
  const done = typeof job.done === "number" ? job.done : 0;
  const failed = typeof job.failed === "number" ? job.failed : 0;
  const skipped = typeof job.skipped === "number" ? job.skipped : 0;
  if (total > 1) {
    setSaveProgress?.({ done, total, failed, skipped });
  } else {
    setSaveProgress?.({ done: 0, total: 0, failed: 0, skipped: 0 });
  }

  if (job.status === "saving") {
    setPhase("saving");
    setError("");
  } else if (job.status === "saved") {
    setPhase("saved");
    setLinkId(job.linkId || "multiple");
    if (job.groupId) {
      setCurrentGroupId(job.groupId);
      setSelectedGroupId(job.groupId);
    }
    if (job.groupName) setGroupQuery(displayGroupName(job.groupName));
    if (job.saveMode) setSaveMode(job.saveMode);
  } else if (job.status === "error") {
    setPhase("error");
    setError(job.error || "Failed to save");
  }
}

function App({ onClose }) {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState("pick");
  const [linkId, setLinkId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupQuery, setGroupQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [error, setError] = useState("");
  const [highlightedTabs, setHighlightedTabs] = useState([]);
  const [activeTabGroup, setActiveTabGroup] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [tabId, setTabId] = useState(null);
  const [saveMode, setSaveMode] = useState("active");
  const [pendingRememberUrl, setPendingRememberUrl] = useState(null);
  const [bootToken, setBootToken] = useState(0);
  const [saveProgress, setSaveProgress] = useState({
    done: 0,
    total: 0,
    failed: 0,
    skipped: 0,
  });
  const inputRef = useRef(null);
  const dismissTimer = useRef(0);
  const phaseRef = useRef(phase);

  phaseRef.current = phase;

  const jobSetters = useMemo(
    () => ({
      setPhase,
      setError,
      setLinkId,
      setCurrentGroupId,
      setGroupQuery,
      setSelectedGroupId,
      setSaveMode,
      setSaveProgress,
    }),
    [],
  );

  const loadContext = useCallback(
    async (rememberUrlProp = null) => {
      const ctx = await sendMessage({ type: "GET_OVERLAY_CONTEXT" });
      if (!ctx?.ok) {
        setPhase("error");
        setError(ctx?.error || "Failed to load");
        setGroupsLoading(false);
        return;
      }

      setApiBase(ctx.apiBase || DEFAULT_API_BASE);
      setTabId(ctx.tabId ?? null);
      setActiveTab(ctx.activeTab || null);
      setHighlightedTabs(ctx.highlightedTabs || []);
      setActiveTabGroup(ctx.activeTabGroup || null);

      const remember = rememberUrlProp || ctx.pendingRememberUrl || null;
      if (remember) {
        setPendingRememberUrl(remember);
        setSaveMode("remember");
      }

      if (ctx.lastError && !ctx.activeSaveJob) {
        setError(ctx.lastError);
        setPhase("error");
      }

      if (Array.isArray(ctx.cachedGroups) && ctx.cachedGroups.length > 0) {
        setGroups(ctx.cachedGroups);
        const defaultGroup = pickDefaultGroup(
          ctx.cachedGroups,
          ctx.lastSavedGroupId,
        );
        if (defaultGroup && phaseRef.current === "pick") {
          setSelectedGroupId(defaultGroup.id);
          setGroupQuery(displayGroupName(defaultGroup.name));
        }
        setGroupsLoading(false);
      }

      if (ctx.activeSaveJob) {
        const job = ctx.activeSaveJob;
        const age = Date.now() - (job.updatedAt || 0);
        const restoreSaving = job.status === "saving";
        const restoreFreshSaved =
          job.status === "saved" && age < 8000 && !remember;
        const restoreError = job.status === "error" && age < 60_000 && !remember;
        if (restoreSaving || restoreFreshSaved || restoreError) {
          applyJobToState(job, jobSetters);
        }
      }

      const groupsRes = await sendMessage({ type: "FETCH_GROUPS" });
      if (groupsRes?.ok && Array.isArray(groupsRes.groups)) {
        setGroups(groupsRes.groups);
        const defaultGroup = pickDefaultGroup(
          groupsRes.groups,
          ctx.lastSavedGroupId,
        );
        if (
          defaultGroup &&
          !ctx.activeSaveJob &&
          phaseRef.current !== "saving" &&
          phaseRef.current !== "saved"
        ) {
          setSelectedGroupId(defaultGroup.id);
          setGroupQuery(displayGroupName(defaultGroup.name));
        }
        setGroupsLoading(false);
        setTimeout(() => inputRef.current?.focus(), 50);
      } else if (!ctx.cachedGroups?.length) {
        setPhase("error");
        setError(groupsRes?.error || "Failed to load groups");
        setGroupsLoading(false);
      } else {
        setGroupsLoading(false);
      }
    },
    [jobSetters],
  );

  useEffect(() => {
    void loadContext(null);
  }, [loadContext, bootToken]);

  useEffect(() => {
    const onShow = (event) => {
      const rememberUrl = event?.detail?.rememberUrl || null;
      const host = document.getElementById(ROOT_ID);
      if (host) host.style.display = "block";

      if (rememberUrl) {
        setPendingRememberUrl(rememberUrl);
        setSaveMode("remember");
        if (phaseRef.current !== "saving") {
          setPhase("pick");
          setError("");
          setLinkId(null);
        }
        return;
      }

      // Already mid-save — only refresh job status, do not remount/reset.
      if (phaseRef.current === "saving") {
        void sendMessage({ type: "GET_OVERLAY_CONTEXT" }).then((ctx) => {
          if (ctx?.activeSaveJob) applyJobToState(ctx.activeSaveJob, jobSetters);
        });
        return;
      }

      // Re-open after a completed save → fresh pick UI.
      if (phaseRef.current === "saved") {
        setPhase("pick");
        setLinkId(null);
        setError("");
      }

      setBootToken((n) => n + 1);
    };

    const onMessage = (message, _sender, sendResponse) => {
      if (message?.type === "SAVE_JOB_UPDATE" && message.job) {
        applyJobToState(message.job, jobSetters);
        sendResponse?.({ ok: true });
        return false;
      }
      return undefined;
    };

    const onStorage = (changes, area) => {
      if (area !== "local" || !changes.activeSaveJob) return;
      applyJobToState(changes.activeSaveJob.newValue, jobSetters);
    };

    window.addEventListener("m404-show-overlay", onShow);
    chrome.runtime.onMessage.addListener(onMessage);
    chrome.storage.onChanged.addListener(onStorage);

    return () => {
      window.removeEventListener("m404-show-overlay", onShow);
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.storage.onChanged.removeListener(onStorage);
    };
  }, [jobSetters]);

  useEffect(() => {
    if (phase !== "saved") {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
      return;
    }
    dismissTimer.current = window.setTimeout(() => {
      onClose?.();
    }, 4500);
    return () => {
      if (dismissTimer.current) window.clearTimeout(dismissTimer.current);
    };
  }, [phase, onClose]);

  const filteredGroups = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    const mapped = groups.map((g) => ({
      ...g,
      name: displayGroupName(g.name),
    }));
    if (!q) return mapped;
    return mapped.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupQuery]);

  const exactMatch = useMemo(() => {
    const q = groupQuery.trim().toLowerCase();
    if (!q) return null;
    return filteredGroups.find((g) => g.name.toLowerCase() === q) ?? null;
  }, [filteredGroups, groupQuery]);

  const currentGroupName = useMemo(() => {
    const name = groups.find((g) => g.id === currentGroupId)?.name ?? null;
    return displayGroupName(name);
  }, [groups, currentGroupId]);

  const resolveTargetGroup = async () => {
    if (selectedGroupId) {
      const existing = groups.find((g) => g.id === selectedGroupId);
      if (existing) return existing;
    }
    if (exactMatch) {
      const existing = groups.find((g) => g.id === exactMatch.id);
      if (existing) return existing;
      return exactMatch;
    }
    const name = groupQuery.trim();
    if (!name) throw new Error("Pick a group first");
    const res = await sendMessage({ type: "CREATE_GROUP", name });
    if (!res?.ok || !res.group) {
      throw new Error(res?.error || "Failed to create group");
    }
    setGroups((prev) =>
      [...prev, res.group].sort((a, b) => a.name.localeCompare(b.name)),
    );
    return res.group;
  };

  const handleSaveModeChange = (mode) => {
    setSaveMode(mode);
    if (mode === "group" && activeTabGroup && activeTabGroup.title) {
      const existingGroup = groups.find(
        (g) =>
          g.name.toLowerCase() === activeTabGroup.title.trim().toLowerCase(),
      );
      if (existingGroup) {
        setSelectedGroupId(existingGroup.id);
        setGroupQuery(displayGroupName(existingGroup.name));
      } else {
        setSelectedGroupId(null);
        setGroupQuery(activeTabGroup.title.trim());
      }
    }
  };

  const saveToSelectedGroup = async () => {
    setError("");
    setPhase("saving");
    try {
      const target = await resolveTargetGroup();
      let items = [];

      if (saveMode === "remember" && pendingRememberUrl) {
        items = [{ url: pendingRememberUrl }];
      } else if (saveMode === "active") {
        if (!activeTab?.url) throw new Error("No tabs found to save");
        items = [
          {
            url: activeTab.url,
            title: activeTab.title,
            tabId: activeTab.id,
            active: true,
          },
        ];
      } else if (saveMode === "selected") {
        const tabs =
          highlightedTabs.length > 0
            ? highlightedTabs
            : activeTab
              ? [activeTab]
              : [];
        items = tabs
          .filter((t) => t?.url)
          .map((t) => ({
            url: t.url,
            title: t.title,
            tabId: t.id,
            active: !!t.active,
          }));
      } else if (saveMode === "group") {
        if (activeTabGroup) {
          const res = await sendMessage({
            type: "GET_GROUP_TABS",
            groupId: activeTabGroup.id,
          });
          if (!res?.ok) {
            throw new Error(res?.error || "Failed to load group tabs");
          }
          items = (res.tabs || [])
            .filter((t) => t?.url)
            .map((t) => ({
              url: t.url,
              title: t.title,
              tabId: t.id,
              active: !!t.active,
            }));
        } else if (activeTab?.url) {
          items = [
            {
              url: activeTab.url,
              title: activeTab.title,
              tabId: activeTab.id,
              active: true,
            },
          ];
        }
      }

      items = items.filter((i) => i.url);
      if (!items.length) throw new Error("No tabs found to save");

      setSaveProgress(
        items.length > 1
          ? { done: 0, total: items.length, failed: 0, skipped: 0 }
          : { done: 0, total: 0, failed: 0, skipped: 0 },
      );

      // Fire-and-forget ack: worker owns the fetch; UI follows SAVE_JOB_UPDATE.
      const res = await sendMessage({
        type: "START_SAVE_JOB",
        tabId,
        items,
        groupId: target.id,
        groupName: target.name,
        saveMode,
      });

      if (!res?.ok) {
        throw new Error(res?.error || "Failed to save");
      }
      if (res.job) applyJobToState(res.job, jobSetters);
      setPendingRememberUrl(null);
    } catch (e) {
      setPhase("error");
      setSaveProgress({ done: 0, total: 0, failed: 0, skipped: 0 });
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

  const saveApiBase = async () => {
    const res = await sendMessage({ type: "SET_API_BASE", apiBase });
    if (res?.ok) setApiBase(res.apiBase);
    setShowSettings(false);
  };

  if (showSettings) {
    return (
      <div className="wrap">
        <div className="panel">
          <button
            type="button"
            className="close-btn"
            aria-label="Close"
            onClick={() => onClose?.()}
          >
            ✕
          </button>
          <div className="panel-head">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => setShowSettings(false)}
            >
              ← Back
            </button>
          </div>
          <label className="field-label">App URL</label>
          <input
            className="settings-input"
            value={apiBase}
            onChange={(e) => setApiBase(e.target.value)}
            placeholder="http://localhost:3000"
          />
          <p className="hint">Change this if your app runs on a different host.</p>
          <div className="group-section" style={{ borderTop: 0, paddingTop: 0 }}>
            <button type="button" className="save-btn" onClick={() => void saveApiBase()}>
              Save App URL
            </button>
          </div>
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
        <button
          type="button"
          className="close-btn"
          aria-label="Close"
          onClick={() => onClose?.()}
        >
          ✕
        </button>

        {phase === "saving" ? (
          <div className="saving-panel">
            {saveProgress.total > 1 ? (
              <div
                className="orb-status"
                role="status"
                aria-live="polite"
                aria-label={`Saving ${Math.min(saveProgress.done + 1, saveProgress.total)} of ${saveProgress.total}`}
              >
                <ThinkingOrb state="searching" size={64} speed={0.95} theme="dark" />
                <span className="orb-status-text">
                  Saving {Math.min(saveProgress.done + 1, saveProgress.total)} of{" "}
                  {saveProgress.total}…
                </span>
              </div>
            ) : (
              <OrbStatus active label="Saving…" state="searching" />
            )}
            {saveProgress.total > 1 ? (
              <div
                className="save-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={saveProgress.total}
                aria-valuenow={saveProgress.done}
                aria-label={`Saved ${saveProgress.done} of ${saveProgress.total} links`}
              >
                <div className="save-progress-track">
                  <div
                    className="save-progress-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (saveProgress.done / saveProgress.total) * 100,
                        ),
                      )}%`,
                    }}
                  />
                </div>
                <p className="save-progress-meta">
                  {saveProgress.done} / {saveProgress.total}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="error-panel" role="alert">
            <p className="error-panel-title">Something went wrong</p>
            <p className="error-panel-message">
              {error || "Could not complete that action"}
            </p>
            <div className="error-panel-actions">
              <button
                type="button"
                className="save-btn"
                onClick={() => {
                  setError("");
                  setPhase("pick");
                  setDropdownOpen(true);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              >
                Try again
              </button>
              <button
                type="button"
                className="ghost-btn error-settings-link"
                onClick={() => setShowSettings(true)}
              >
                Check App URL
              </button>
            </div>
          </div>
        ) : null}

        {phase === "pick" || phase === "saved" ? (
          <>
            {phase === "pick" && !groupsLoading ? (
              <div className="orb-status orb-status--listen">
                <ThinkingOrb state="listening" size={64} speed={0.95} theme="dark" />
                <span className="orb-status-text">
                  {saveMode === "remember" && pendingRememberUrl
                    ? `Remember ${hostnameOf(pendingRememberUrl)}`
                    : "Choose a group, then save"}
                </span>
              </div>
            ) : phase === "saved" ? (
              <div className="saved-row">
                <span className="saved-text">
                  {saveProgress.total > 1
                    ? `Saved ${Math.max(0, saveProgress.total - (saveProgress.failed || 0) - (saveProgress.skipped || 0))} of ${saveProgress.total}`
                    : "Saved to memory404"}
                </span>
              </div>
            ) : null}

            {phase === "pick" &&
            saveMode === "remember" &&
            pendingRememberUrl ? (
              <p className="hint" title={pendingRememberUrl}>
                {pendingRememberUrl}
              </p>
            ) : null}

            {phase === "pick" &&
            saveMode !== "remember" &&
            (highlightedTabs.length > 1 || activeTabGroup) ? (
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
                <OrbStatus active label="Loading groups…" state="searching" />
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
                            {g.id === selectedGroupId ? (
                              <span className="check">✓</span>
                            ) : null}
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
                      {saveMode === "remember"
                        ? "Remember link"
                        : saveMode === "active"
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
                      {saveMode === "remember"
                        ? "Link remembered"
                        : saveMode === "active"
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

function ensureStyles() {
  if (document.getElementById("m404-overlay-style")) return;
  const style = document.createElement("style");
  style.id = "m404-overlay-style";
  style.textContent = overlayCss;
  document.documentElement.appendChild(style);
}

function ensureHost() {
  ensureStyles();
  let host = document.getElementById(ROOT_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = ROOT_ID;
    document.documentElement.appendChild(host);
  }
  return host;
}

function hideOverlay() {
  const host = document.getElementById(ROOT_ID);
  if (host) host.style.display = "none";
  void sendMessage({ type: "CLOSE_OVERLAY" });
}

function showOverlay(rememberUrl = null) {
  const host = ensureHost();
  host.style.display = "block";

  if (!host.__m404Root) {
    host.__m404Root = createRoot(host);
    host.__m404Root.render(
      <App
        onClose={() => {
          hideOverlay();
        }}
      />,
    );
  }

  window.dispatchEvent(
    new CustomEvent("m404-show-overlay", {
      detail: { rememberUrl },
    }),
  );
}

(() => {
  if (window.__M404_OVERLAY_BOOTSTRAPPED__) {
    // Already live in this document — wait for SHOW_OVERLAY from the worker.
    return;
  }
  window.__M404_OVERLAY_BOOTSTRAPPED__ = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "SHOW_OVERLAY") {
      showOverlay(message.rememberUrl || null);
      sendResponse?.({ ok: true });
      return false;
    }
    if (message?.type === "HIDE_OVERLAY") {
      hideOverlay();
      sendResponse?.({ ok: true });
      return false;
    }
    return undefined;
  });

  // Initial inject: show immediately so UI appears even if the follow-up
  // message is delayed. Subsequent SHOW_OVERLAY calls reuse the same root.
  showOverlay(null);
})();
