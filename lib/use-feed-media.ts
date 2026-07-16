"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const NEARBY_MARGIN = "180px 0px";
const VISIBILITY_THRESHOLDS = [0, 0.05, 0.15, 0.35, 0.5, 0.75, 1];
const MAX_CONCURRENT_LOADS = 6;
const MAX_RETAINED_MEDIA = 24;
const RELEASE_AFTER_MS = 45_000;
const LOAD_SLOT_TIMEOUT_MS = 15_000;

type FeedMediaEntry = {
  element: HTMLElement;
  setActivated: (activated: boolean) => void;
  nearby: boolean;
  visible: boolean;
  activated: boolean;
  queued: boolean;
  loading: boolean;
  lastVisibleAt: number;
  releaseTimer: ReturnType<typeof setTimeout> | null;
  loadSlotTimer: ReturnType<typeof setTimeout> | null;
};

const entries = new Map<HTMLElement, FeedMediaEntry>();
let nearbyObserver: IntersectionObserver | null = null;
let visibilityObserver: IntersectionObserver | null = null;
let activeLoads = 0;
let processingQueue = false;

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer !== null) clearTimeout(timer);
}

function releaseLoadSlot(entry: FeedMediaEntry) {
  clearTimer(entry.loadSlotTimer);
  entry.loadSlotTimer = null;
  if (!entry.loading) return;
  entry.loading = false;
  activeLoads = Math.max(0, activeLoads - 1);
  processActivationQueue();
}

function deactivate(entry: FeedMediaEntry) {
  clearTimer(entry.releaseTimer);
  entry.releaseTimer = null;
  entry.queued = false;
  releaseLoadSlot(entry);
  if (!entry.activated) return;
  entry.activated = false;
  entry.setActivated(false);
}

function trimRetainedMedia() {
  const activated = [...entries.values()].filter((entry) => entry.activated);
  if (activated.length <= MAX_RETAINED_MEDIA) return;

  const releasable = activated
    .filter((entry) => !entry.nearby && !entry.visible)
    .sort((a, b) => a.lastVisibleAt - b.lastVisibleAt);

  for (const entry of releasable) {
    if ([...entries.values()].filter((item) => item.activated).length <= MAX_RETAINED_MEDIA) {
      break;
    }
    deactivate(entry);
  }
}

function activate(entry: FeedMediaEntry) {
  entry.queued = false;
  if (entry.activated || !entry.nearby || !entries.has(entry.element)) return;

  entry.activated = true;
  entry.loading = true;
  entry.lastVisibleAt = Date.now();
  activeLoads += 1;
  entry.setActivated(true);
  entry.loadSlotTimer = setTimeout(
    () => releaseLoadSlot(entry),
    LOAD_SLOT_TIMEOUT_MS,
  );
  trimRetainedMedia();
}

function processActivationQueue() {
  if (processingQueue || typeof document === "undefined" || document.hidden) return;
  processingQueue = true;
  try {
    const queue = [...entries.values()]
      .filter((entry) => entry.queued && entry.nearby && !entry.activated)
      .sort((a, b) => Number(b.visible) - Number(a.visible) || b.lastVisibleAt - a.lastVisibleAt);

    for (const entry of queue) {
      if (activeLoads >= MAX_CONCURRENT_LOADS) break;
      activate(entry);
    }
  } finally {
    processingQueue = false;
  }
}

function queueActivation(entry: FeedMediaEntry) {
  clearTimer(entry.releaseTimer);
  entry.releaseTimer = null;
  if (entry.activated) return;
  entry.queued = true;
  processActivationQueue();
}

function scheduleRelease(entry: FeedMediaEntry) {
  entry.queued = false;
  clearTimer(entry.releaseTimer);
  if (!entry.activated) return;
  entry.releaseTimer = setTimeout(() => {
    if (!entry.nearby) deactivate(entry);
  }, RELEASE_AFTER_MS);
  trimRetainedMedia();
}

function ensureObservers() {
  if (typeof window === "undefined" || nearbyObserver || !("IntersectionObserver" in window)) {
    return;
  }

  nearbyObserver = new IntersectionObserver(
    (observed) => {
      for (const observation of observed) {
        const entry = entries.get(observation.target as HTMLElement);
        if (!entry) continue;
        entry.nearby =
          observation.isIntersecting &&
          observation.intersectionRect.width > 0 &&
          observation.intersectionRect.height > 0;
        if (entry.nearby) queueActivation(entry);
        else scheduleRelease(entry);
      }
    },
    { rootMargin: NEARBY_MARGIN, threshold: 0 },
  );

  visibilityObserver = new IntersectionObserver(
    (observed) => {
      for (const observation of observed) {
        const entry = entries.get(observation.target as HTMLElement);
        if (!entry) continue;
        entry.visible = observation.isIntersecting && observation.intersectionRatio >= 0.05;
        if (entry.visible) {
          entry.lastVisibleAt = Date.now();
          queueActivation(entry);
        }
      }
      processActivationQueue();
    },
    { rootMargin: "0px", threshold: VISIBILITY_THRESHOLDS },
  );
}

function registerFeedMedia(
  element: HTMLElement,
  setActivated: (activated: boolean) => void,
) {
  ensureObservers();

  const entry: FeedMediaEntry = {
    element,
    setActivated,
    nearby: false,
    visible: false,
    activated: false,
    queued: false,
    loading: false,
    lastVisibleAt: 0,
    releaseTimer: null,
    loadSlotTimer: null,
  };
  entries.set(element, entry);

  if (!nearbyObserver || !visibilityObserver) {
    entry.nearby = true;
    activate(entry);
  } else {
    nearbyObserver.observe(element);
    visibilityObserver.observe(element);
  }

  return {
    settleLoad: () => releaseLoadSlot(entry),
    unregister: () => {
      nearbyObserver?.unobserve(element);
      visibilityObserver?.unobserve(element);
      deactivate(entry);
      entries.delete(element);
    },
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) processActivationQueue();
  });
}

export function useFeedMediaActivation(enabled: boolean) {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [activated, setActivated] = useState(false);
  const registrationRef = useRef<ReturnType<typeof registerFeedMedia> | null>(
    null,
  );

  const containerRef = useCallback((element: HTMLElement | null) => {
    setNode(element);
  }, []);

  useEffect(() => {
    if (!node || !enabled) return;

    const registration = registerFeedMedia(node, setActivated);
    registrationRef.current = registration;
    return () => {
      registration.unregister();
      if (registrationRef.current === registration) {
        registrationRef.current = null;
      }
    };
  }, [enabled, node]);

  const settleLoad = useCallback(() => {
    registrationRef.current?.settleLoad();
  }, []);

  return { activated, containerRef, settleLoad };
}
