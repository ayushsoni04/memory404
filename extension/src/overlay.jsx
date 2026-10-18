import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ThinkingOrb } from "thinking-orbs";
import LoadingState from "./LoadingState";
import { groupNameMatches, groupNamesMatchExactly } from "./group-query";
import { noteCountLabel, noteIssue } from "./note-limit";
import {
  chooseSaveGroup,
  groupListEmptyCopy,
  groupChevronLabel,
  groupListIsShown,
  groupPickerKeyAction,
  libraryGroupForTitle,
} from "./group-picker";
import { containPanelTab, focusOverlayPanel, panelEscapeAction } from "./panel-keys";
import { phaseForSaveStatus } from "./save-cancel";
import { savingStageLabel } from "./save-progress";
import { saveHeadline, saveRowsToReview } from "./save-outcome";
import { signInSaveHint } from "./sign-in-hint";
import { libraryHomeUrl } from "./library-url";
import { APP_URL_HINT, normalizeApiBase } from "./api-base";
import { EMAIL_INVALID, keepSignInForm, loginEmailIssue } from "./login-email";
import PasswordField from "./PasswordField";
import { CreateGroupOption, CurrentGroupLine, GroupOptionName } from "./GroupName";
import SaveTaskRows from "./SaveTaskRows";
import overlayCss from "./overlay-styles.css";

const ROOT_ID = "m404-save-root";
const DEFAULT_API_BASE = "http://localhost:3000";

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

function SingleSaveLabel() {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Date.now() - started);
    }, 400);
    return () => window.clearInterval(id);
  }, []);
  return <LoadingState active variant="Drive" label={savingStageLabel(elapsed)} />;
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
    setSaveItems,
  } = setters;

  const total = typeof job.total === "number" ? job.total : 0;
  const done = typeof job.done === "number" ? job.done : 0;
  const failed = typeof job.failed === "number" ? job.failed : 0;
  const skipped = typeof job.skipped === "number" ? job.skipped : 0;
  const already = typeof job.already === "number" ? job.already : 0;
  const saved =
    typeof job.saved === "number"
      ? job.saved
      : Math.max(0, total - already - failed - skipped);
  const duplicateMessage =
    typeof job.duplicateMessage === "string" ? job.duplicateMessage : "";
  setSaveProgress?.({
    done,
    total,
    failed,
    skipped,
    saved,
    already,
    duplicateMessage,
  });

  if (Array.isArray(job.itemResults) && job.itemResults.length) {
    setSaveItems?.(job.itemResults);
  } else if (Array.isArray(job.items) && job.items.length > 1) {
    setSaveItems?.(
      job.items.map((item, i) => {
        let status = "pending";
        if (i < done) status = "saved";
        else if (i === done && job.status === "saving") status = "saving";
        return {
          url: typeof item?.url === "string" ? item.url : "",
          title:
            (typeof item?.title === "string" && item.title.trim()) ||
            hostnameOf(item?.url) ||
            "Link",
          status,
          error: null,
        };
      }),
    );
  } else if (job.status === "saved" || job.status === "error") {
    // keep last multi-item list for the saved summary if present
  } else {
    setSaveItems?.([]);
  }

  const nextPhase = phaseForSaveStatus(job.status);
  if (nextPhase === "saving") {
    setPhase("saving");
    setError("");
  } else if (nextPhase === "pick") {
    setPhase("pick");
    setError("");
    setSaveItems?.([]);
  } else if (nextPhase === "saved") {
    setPhase("saved");
    setLinkId(job.linkId || "multiple");
    if (job.groupId) {
      setCurrentGroupId(job.groupId);
      setSelectedGroupId(job.groupId);
    }
    if (job.groupName) setGroupQuery(displayGroupName(job.groupName));
    if (job.saveMode) setSaveMode(job.saveMode);
  } else if (nextPhase === "error") {
    setPhase("error");
    setError(job.error || "Failed to save");
  }
}

function App({ onClose }) {
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [apiBaseError, setApiBaseError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [phase, setPhase] = useState("pick");
  const [linkId, setLinkId] = useState(null);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupQuery, setGroupQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(true);
  const [highlight, setHighlight] = useState(-1);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [createName, setCreateName] = useState("");
  const [error, setError] = useState("");
  const [highlightedTabs, setHighlightedTabs] = useState([]);
  const [activeTabGroup, setActiveTabGroup] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [tabId, setTabId] = useState(null);
  const [saveMode, setSaveMode] = useState("active");
  const [pendingRememberUrl, setPendingRememberUrl] = useState(null);
  const [bootToken, setBootToken] = useState(0);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const [saveProgress, setSaveProgress] = useState({
    done: 0,
    total: 0,
    failed: 0,
    skipped: 0,
  });
  const [saveItems, setSaveItems] = useState([]);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const phaseRef = useRef(phase);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [noteError, setNoteError] = useState("");

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
      setSaveItems,
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
        // Only restore a save UI if it's freshly active. Older "saving" jobs are
        // zombies from a previous attempt and must not block a new multi-select.
        const restoreSaving = job.status === "saving" && age < 5_000;
        const restoreFreshSaved =
          job.status === "saved" && age < 8_000 && !remember;
        const restoreError = job.status === "error" && age < 30_000 && !remember;
        if (restoreSaving || restoreFreshSaved || restoreError) {
          applyJobToState(job, jobSetters);
        } else if (job.status === "saving") {
          void sendMessage({ type: "CANCEL_SAVE_JOB" });
        }
        if (restoreSaving) {
          void sendMessage({ type: "RESUME_SAVE_JOB" });
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
    const id = window.setTimeout(() => {
      focusOverlayPanel(panelRef.current);
    }, 50);
    return () => window.clearTimeout(id);
  }, [groupsLoading, phase, showSettings]);

  useEffect(() => {
    const onKey = (event) => {
      const host = document.getElementById(ROOT_ID);
      if (!host || host.style.display === "none") return;
      const root = panelRef.current;
      if (!root) return;
      const action = panelEscapeAction({
        key: event.key,
        groupListOpen: dropdownOpen && phase === "pick" && !showSettings,
        settingsOpen: showSettings,
      });
      if (action !== "ignore") {
        event.preventDefault();
        event.stopPropagation();
        if (action === "close-list") {
          setDropdownOpen(false);
          setHighlight(-1);
          return;
        }
        if (action === "close-settings") {
          setShowSettings(false);
          return;
        }
        onClose?.();
        return;
      }
      containPanelTab(event, root);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [dropdownOpen, onClose, phase, showSettings]);

  useEffect(() => {
    setNoteDraft("");
    setNoteSaving(false);
    setNoteSaved(false);
    setNoteError("");
  }, [linkId]);

  const filteredGroups = useMemo(() => {
    const mapped = groups.map((g) => ({
      ...g,
      name: displayGroupName(g.name),
    }));
    if (!groupQuery.trim()) return mapped;
    return mapped.filter((g) => groupNameMatches(g.name, groupQuery));
  }, [groups, groupQuery]);

  const exactMatch = useMemo(() => {
    if (!groupQuery.trim()) return null;
    return (
      filteredGroups.find((g) => groupNamesMatchExactly(g.name, groupQuery)) ??
      null
    );
  }, [filteredGroups, groupQuery]);

  const currentGroupName = useMemo(() => {
    const name = groups.find((g) => g.id === currentGroupId)?.name ?? null;
    return displayGroupName(name);
  }, [groups, currentGroupId]);

  const libraryUrl = libraryHomeUrl(apiBase);

  const resolveTargetGroup = async () => {
    const selected = selectedGroupId
      ? (groups.find((g) => g.id === selectedGroupId) ?? null)
      : null;
    const exact = exactMatch
      ? (groups.find((g) => g.id === exactMatch.id) ?? exactMatch)
      : null;
    const visible = filteredGroups.map(
      (group) => groups.find((item) => item.id === group.id) ?? group,
    );
    const choice = chooseSaveGroup({
      selected,
      exact,
      visible,
      query: groupQuery,
      createName,
    });
    if (choice.type === "use") return choice.group;
    if (choice.type !== "create") throw new Error("Pick a group first");
    const res = await sendMessage({ type: "CREATE_GROUP", name: choice.name });
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
    setCreateName("");
    if (mode === "group" && activeTabGroup && activeTabGroup.title) {
      const existingGroup = libraryGroupForTitle(groups, activeTabGroup.title);
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
      setSaveItems(
        items.length > 1
          ? items.map((item, i) => ({
              url: item.url,
              title: item.title || hostnameOf(item.url),
              status: i === 0 ? "saving" : "pending",
              error: null,
            }))
          : [],
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
      setCreateName("");
      setPendingRememberUrl(null);
      setNoteDraft("");
      setNoteSaved(false);
      setNoteError("");
    } catch (e) {
      setPhase("error");
      setSaveProgress({ done: 0, total: 0, failed: 0, skipped: 0 });
      setSaveItems([]);
      setError(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const outcome = saveHeadline(saveProgress);
  const canAddNote =
    phase === "saved" && outcome.offerNote && linkId && linkId !== "multiple";

  const noteProblem = noteIssue(noteDraft);
  const noteCount = noteCountLabel(noteDraft);

  const saveNote = async () => {
    const notes = noteDraft.trim();
    const issue = noteIssue(noteDraft);
    if (!canAddNote || !notes) return;
    if (issue) {
      setNoteError(issue);
      return;
    }
    setNoteSaving(true);
    setNoteError("");
    const res = await sendMessage({
      type: "SAVE_LINK_NOTE",
      linkId,
      notes,
    });
    setNoteSaving(false);
    if (!res?.ok) {
      setNoteError(res?.error || "Could not save the note");
      return;
    }
    setNoteSaved(true);
  };

  const pickGroup = (g) => {
    setSelectedGroupId(g.id);
    setGroupQuery(g.name);
    setCreateName("");
    setDropdownOpen(false);
    setError("");
  };

  const onGroupKeyDown = (e) => {
    const action = groupPickerKeyAction({
      key: e.key,
      highlight,
      count: filteredGroups.length,
      hasExactMatch: Boolean(exactMatch),
      hasQuery: Boolean(groupQuery.trim()),
    });
    if (action.type === "highlight") {
      e.preventDefault();
      setDropdownOpen(true);
      setHighlight(action.index);
      const id = filteredGroups[action.index]?.id;
      if (id) {
        requestAnimationFrame(() => {
          document.getElementById(`m404-group-${id}`)?.scrollIntoView({ block: "nearest" });
        });
      }
      return;
    }
    if (action.type === "pick") {
      e.preventDefault();
      const group = filteredGroups[action.index];
      if (group) pickGroup(group);
      setHighlight(-1);
      return;
    }
    if (action.type === "pick-exact") {
      e.preventDefault();
      if (exactMatch) pickGroup(exactMatch);
      setHighlight(-1);
      return;
    }
    if (action.type === "create") {
      e.preventDefault();
      setCreateName(groupQuery.trim());
      setSelectedGroupId(null);
      setDropdownOpen(false);
      setHighlight(-1);
      return;
    }
    if (action.type === "close") {
      setDropdownOpen(false);
      setHighlight(-1);
    }
  };

  const needsSignIn = keepSignInForm(error);

  const submitSignIn = async () => {
    const emailProblem = loginEmailIssue(loginEmail);
    if (emailProblem) {
      setError(emailProblem);
      return;
    }
    setLoginPending(true);
    const res = await sendMessage({
      type: "SIGN_IN",
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setLoginPending(false);
    if (!res?.ok) {
      setError(res?.error || "Failed to sign in");
      return;
    }
    setLoginPassword("");
    setError("");
    setPhase("pick");
    setGroupsLoading(true);
    setBootToken((n) => n + 1);
  };

  const saveApiBase = async () => {
    const normalized = normalizeApiBase(apiBase);
    if (!normalized.ok) {
      setApiBaseError(normalized.error);
      return;
    }
    setApiBaseError("");
    const res = await sendMessage({ type: "SET_API_BASE", apiBase: normalized.apiBase });
    if (!res?.ok) {
      setApiBaseError(res?.error || APP_URL_HINT);
      return;
    }
    setApiBase(res.apiBase);
    setShowSettings(false);
    if (res.signedOut) {
      setGroups([]);
      setSelectedGroupId(null);
      setGroupQuery("");
      setBootToken((n) => n + 1);
    }
  };

  if (showSettings) {
    return (
      <div className="wrap" ref={panelRef}>
        <div className="panel" role="dialog" aria-modal="true" aria-label="Extension settings">
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
          <label className="field-label" htmlFor="m404-app-url">
            App URL
          </label>
          <input
            id="m404-app-url"
            className="settings-input"
            value={apiBase}
            onChange={(e) => {
              setApiBase(e.target.value);
              setApiBaseError("");
            }}
            placeholder="http://localhost:3000"
            aria-invalid={apiBaseError ? true : undefined}
            aria-describedby={apiBaseError ? "m404-app-url-error" : undefined}
          />
          {apiBaseError ? (
            <p id="m404-app-url-error" className="field-error" role="alert">
              {apiBaseError}
            </p>
          ) : (
            <p className="hint">Change this if your app runs on a different host.</p>
          )}
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
    <div className="wrap" ref={panelRef}>
      <div className="panel" role="dialog" aria-modal="true" aria-label="Save to memory404">
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
            {saveProgress.total > 1 || saveItems.length > 1 ? (
              <>
                <div className="saving-header">
                  <LoadingState
                    active
                    variant="Drive"
                    label={`Saving ${Math.min(saveProgress.done + 1, saveProgress.total || saveItems.length)} of ${saveProgress.total || saveItems.length}`}
                  />
                </div>
                <SaveTaskRows items={saveItems} />
              </>
            ) : (
              <div className="saving-header saving-header--single">
                <SingleSaveLabel />
              </div>
            )}
            <button
              type="button"
              className="ghost-btn cancel-save-btn"
              onClick={() => {
                void sendMessage({ type: "CANCEL_SAVE_JOB" }).then(() => {
                  setPhase("pick");
                  setSaveProgress({ done: 0, total: 0, failed: 0, skipped: 0 });
                  setSaveItems([]);
                  setError("");
                });
              }}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {phase === "error" ? (
          <div className="error-panel" role="alert">
            <p className="error-panel-title">
              {needsSignIn ? "Sign in" : "Something went wrong"}
            </p>
            <p id="m404-overlay-error" className="error-panel-message">
              {error || "Could not complete that action"}
            </p>
            {needsSignIn ? (
              <p className="hint">
                {signInSaveHint({
                  saveMode,
                  selectedCount: highlightedTabs.length,
                  groupTitle: activeTabGroup?.title || "",
                })}
              </p>
            ) : null}
            {needsSignIn ? (
              <form
                className="error-panel-actions"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitSignIn();
                }}
              >
                <label className="field-label" htmlFor="m404-email">
                  Email
                </label>
                <input
                  id="m404-email"
                  className="settings-input"
                  type="email"
                  autoComplete="email"
                  value={loginEmail}
                  onChange={(event) => {
                    const next = event.target.value;
                    setLoginEmail(next);
                    if (error === EMAIL_INVALID && !loginEmailIssue(next)) {
                      setError("Sign in to save this page.");
                    }
                  }}
                  aria-invalid={error === EMAIL_INVALID ? true : undefined}
                  aria-describedby={
                    error === EMAIL_INVALID ? "m404-overlay-error" : undefined
                  }
                  required
                />
                <label className="field-label" htmlFor="m404-password">
                  Password
                </label>
                <PasswordField
                  id="m404-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
                <button type="submit" className="save-btn" disabled={loginPending}>
                  {loginPending ? "Signing in…" : "Sign in"}
                </button>
                <button
                  type="button"
                  className="ghost-btn error-settings-link"
                  onClick={() => setShowSettings(true)}
                >
                  Check App URL
                </button>
              </form>
            ) : (
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
            )}
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
                    : groups.length === 0
                      ? "Type a name to create a group, then save"
                      : "Choose a group, then save"}
                </span>
              </div>
            ) : phase === "saved" ? (
              <div className="saved-row">
                <span className="saved-text">{outcome.title}</span>
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
                <div className="saving-header saving-header--single">
                  <LoadingState active variant="Dots" label="Loading groups" />
                </div>
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
                        setCreateName("");
                        setDropdownOpen(true);
                        setHighlight(-1);
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
                      role="combobox"
                      aria-label="Group"
                      aria-autocomplete="list"
                      aria-expanded={groupListIsShown(phase, dropdownOpen)}
                      aria-controls={
                        groupListIsShown(phase, dropdownOpen) ? "m404-group-list" : undefined
                      }
                      aria-activedescendant={
                        dropdownOpen && highlight >= 0 && filteredGroups[highlight]
                          ? `m404-group-${filteredGroups[highlight].id}`
                          : undefined
                      }
                    />
                    <button
                      type="button"
                      className="chevron-btn"
                      aria-label={groupChevronLabel(dropdownOpen)}
                      aria-expanded={dropdownOpen}
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

                  {groupListIsShown(phase, dropdownOpen) ? (
                    <ul
                      id="m404-group-list"
                      className="group-list"
                      role="listbox"
                      aria-label="Groups"
                    >
                      {filteredGroups.length ? null : (
                        <li role="presentation">
                          <p className="group-empty">{groupListEmptyCopy(groupQuery)}</p>
                        </li>
                      )}
                      {filteredGroups.map((g, index) => (
                        <li key={g.id} role="presentation">
                          <button
                            id={`m404-group-${g.id}`}
                            type="button"
                            role="option"
                            tabIndex={-1}
                            aria-selected={g.id === selectedGroupId}
                            className={`group-option ${g.id === selectedGroupId ? "active" : ""} ${
                              index === highlight ? "highlighted" : ""
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onMouseEnter={() => setHighlight(index)}
                            onClick={() => {
                              pickGroup(g);
                              setHighlight(-1);
                            }}
                          >
                            <GroupOptionName name={g.name} />
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
                    <CreateGroupOption
                      name={groupQuery.trim()}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCreateName(groupQuery.trim());
                        setSelectedGroupId(null);
                        setDropdownOpen(false);
                      }}
                    />
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

                  {phase === "saved" && currentGroupName && outcome.offerNote ? (
                    <CurrentGroupLine name={currentGroupName} />
                  ) : null}

                  {phase === "saved" && saveRowsToReview(saveItems).length ? (
                    <SaveTaskRows items={saveItems} />
                  ) : null}

                  {phase === "saved" && outcome.detail ? (
                    <p className="assign-note" role="status">
                      {outcome.detail}
                    </p>
                  ) : phase === "saved" && linkId && outcome.offerNote ? (
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

                  {canAddNote ? (
                    noteSaved ? (
                      <p className="assign-note">Note saved</p>
                    ) : (
                      <div className="note-field">
                        <label className="field-label" htmlFor="m404-save-note">
                          Add a note
                        </label>
                        <textarea
                          id="m404-save-note"
                          className="note-input"
                          rows={2}
                          value={noteDraft}
                          placeholder="What should you remember?"
                          aria-invalid={noteProblem ? true : undefined}
                          aria-describedby={
                            [
                              noteCount ? "m404-note-count" : null,
                              noteError ? "m404-note-error" : null,
                            ]
                              .filter(Boolean)
                              .join(" ") || undefined
                          }
                          onChange={(e) => {
                            setNoteDraft(e.target.value);
                            setNoteError(noteIssue(e.target.value) || "");
                          }}
                        />
                        {noteCount ? (
                          <p
                            id="m404-note-count"
                            className={`note-count${noteProblem ? " is-over" : ""}`}
                          >
                            {noteCount}
                          </p>
                        ) : null}
                        {noteDraft.trim() ? (
                          <button
                            type="button"
                            className="save-btn"
                            disabled={noteSaving || Boolean(noteProblem)}
                            onClick={() => void saveNote()}
                          >
                            {noteSaving ? "Saving…" : "Save note"}
                          </button>
                        ) : null}
                        {noteError ? (
                          <p id="m404-note-error" className="field-error" role="alert">
                            {noteError}
                          </p>
                        ) : null}
                      </div>
                    )
                  ) : null}

                  {phase === "saved" && libraryUrl ? (
                    <a
                      className="library-link"
                      href={libraryUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View in memory404
                    </a>
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
