/**
 * Hover any http(s) link → "Remember this link" chip.
 * Click → tell the background to start the add-link flow (popup / save).
 */
(() => {
  const HOVER_DELAY_MS = 420;
  const HIDE_DELAY_MS = 180;
  const ROOT_ID = "m404-remember-root";

  let hoverTimer = 0;
  let hideTimer = 0;
  let currentAnchor = null;
  let currentUrl = null;
  let root = null;
  let chip = null;
  let statusEl = null;

  function isRememberableUrl(href) {
    if (!href) return false;
    try {
      const u = new URL(href, location.href);
      if (u.protocol !== "http:" && u.protocol !== "https:") return false;
      // Skip same-page hash jumps with no real navigation target
      if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search) {
        if (u.hash) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  function absoluteUrl(href) {
    try {
      return new URL(href, location.href).href;
    } catch {
      return null;
    }
  }

  function ensureUi() {
    if (root && document.documentElement.contains(root)) return;

    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("data-m404", "remember");

    const shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        .chip {
          position: fixed;
          z-index: 2147483646;
          display: none;
          align-items: center;
          gap: 8px;
          max-width: min(280px, calc(100vw - 24px));
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(12, 12, 12, 0.92);
          color: #f5f5f5;
          font: 600 12px/1.2 ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif;
          letter-spacing: 0.01em;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          cursor: pointer;
          user-select: none;
          transform: translateY(6px);
          opacity: 0;
          transition: opacity 160ms cubic-bezier(0.23, 1, 0.32, 1),
            transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .chip[data-visible="true"] {
          display: inline-flex;
          opacity: 1;
          transform: translateY(0);
        }
        .chip[data-busy="true"] {
          pointer-events: none;
          opacity: 0.85;
        }
        .chip:hover {
          border-color: rgba(255, 255, 255, 0.28);
        }
        .chip:focus-visible {
          outline: 2px solid rgba(255, 255, 255, 0.45);
          outline-offset: 2px;
        }
        .mark {
          flex: 0 0 auto;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: #f5f5f5;
          color: #0c0c0c;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      </style>
      <button type="button" class="chip" part="chip">
        <span class="mark" aria-hidden="true">4</span>
        <span class="label">Remember this link</span>
      </button>
    `;

    chip = shadow.querySelector(".chip");
    statusEl = shadow.querySelector(".label");

    chip.addEventListener("mouseenter", () => {
      window.clearTimeout(hideTimer);
    });
    chip.addEventListener("mouseleave", () => {
      scheduleHide();
    });
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      void onRememberClick();
    });

    document.documentElement.appendChild(root);
  }

  function positionChip(anchor) {
    ensureUi();
    const rect = anchor.getBoundingClientRect();
    const chipWidth = 200;
    const left = Math.min(
      Math.max(12, rect.left),
      window.innerWidth - chipWidth - 12,
    );
    let top = rect.bottom + 8;
    if (top + 44 > window.innerHeight) {
      top = Math.max(12, rect.top - 44);
    }
    chip.style.left = `${Math.round(left)}px`;
    chip.style.top = `${Math.round(top)}px`;
  }

  function showChip(anchor, url) {
    ensureUi();
    currentAnchor = anchor;
    currentUrl = url;
    statusEl.textContent = "Remember this link";
    chip.dataset.busy = "false";
    positionChip(anchor);
    chip.dataset.visible = "true";
  }

  function hideChip() {
    if (!chip) return;
    chip.dataset.visible = "false";
    chip.dataset.busy = "false";
    currentAnchor = null;
    currentUrl = null;
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      hideChip();
    }, HIDE_DELAY_MS);
  }

  function findAnchor(target) {
    if (!(target instanceof Element)) return null;
    if (target.closest(`#${ROOT_ID}`)) return null;
    const a = target.closest("a[href]");
    if (!a) return null;
    const url = absoluteUrl(a.getAttribute("href"));
    if (!isRememberableUrl(url)) return null;
    return { anchor: a, url };
  }

  async function onRememberClick() {
    if (!currentUrl || !chip) return;
    const url = currentUrl;
    chip.dataset.busy = "true";
    statusEl.textContent = "Opening…";

    try {
      const res = await chrome.runtime.sendMessage({
        type: "REMEMBER_LINK",
        url,
      });
      if (res?.ok) {
        statusEl.textContent =
          res.mode === "saved" ? "Remembered" : "Choose a group…";
        window.setTimeout(() => hideChip(), res.mode === "saved" ? 1200 : 600);
      } else {
        statusEl.textContent = res?.error || "Failed";
        chip.dataset.busy = "false";
        window.setTimeout(() => {
          if (statusEl) statusEl.textContent = "Remember this link";
        }, 1400);
      }
    } catch (e) {
      statusEl.textContent = "Failed";
      chip.dataset.busy = "false";
      window.setTimeout(() => {
        if (statusEl) statusEl.textContent = "Remember this link";
      }, 1400);
    }
  }

  document.addEventListener(
    "mouseover",
    (e) => {
      const hit = findAnchor(e.target);
      if (!hit) return;
      window.clearTimeout(hideTimer);
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        showChip(hit.anchor, hit.url);
      }, HOVER_DELAY_MS);
    },
    true,
  );

  document.addEventListener(
    "mouseout",
    (e) => {
      const hit = findAnchor(e.target);
      if (!hit) return;
      const related = e.relatedTarget;
      if (related instanceof Node && hit.anchor.contains(related)) return;
      if (related instanceof Element && related.closest(`#${ROOT_ID}`)) return;
      window.clearTimeout(hoverTimer);
      scheduleHide();
    },
    true,
  );

  window.addEventListener(
    "scroll",
    () => {
      window.clearTimeout(hoverTimer);
      hideChip();
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") hideChip();
    },
    true,
  );
})();
