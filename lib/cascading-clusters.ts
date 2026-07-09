import type { LinkApiRow } from "@/lib/links";

export type CanvasItem = {
  id: string;
  url: string;
  title: string;
  previewImage: string | null;
  tags?: string[];
  embedding?: number[] | null;
  createdAt: string;
};

export type ClusterNode = {
  id: string;
  name: string;
  items: CanvasItem[];
  subClusters: ClusterNode[];
  parentClusterId: string | null;
  embedding?: number[] | null;
};

export type ClusterBuildResult = {
  clusters: ClusterNode[];
  uncategorizedItems: CanvasItem[];
  membership: Record<string, string | null>;
};

const BASE_SIMILARITY_THRESHOLD = 0.32;
const CASCADE_SIZE_THRESHOLD = 8;
const MAX_CASCADE_DEPTH = 2;

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "into",
  "that",
  "this",
  "you",
  "your",
  "how",
  "are",
  "not",
  "bookmark",
  "www",
  "com",
  "org",
  "net",
]);

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 3 && !STOPWORDS.has(part));
}

function tokensForItem(item: CanvasItem): Set<string> {
  const host = safeHostname(item.url);
  const hostTokens = host ? host.split(".").filter(Boolean) : [];
  const raw = [
    ...tokenize(item.title),
    ...tokenize(item.url),
    ...(item.tags ?? []).flatMap((tag) => tokenize(tag)),
    ...hostTokens.flatMap((token) => tokenize(token)),
  ];
  return new Set(raw);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function toCentroidTokenSet(items: CanvasItem[]): Set<string> {
  const freq = new Map<string, number>();
  for (const item of items) {
    for (const token of tokensForItem(item)) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([token]) => token);
  return new Set(sorted);
}

function clusterName(items: CanvasItem[]): string {
  const domains = new Map<string, number>();
  const words = new Map<string, number>();
  for (const item of items) {
    const domain = safeHostname(item.url);
    if (domain) domains.set(domain, (domains.get(domain) ?? 0) + 1);
    for (const token of tokensForItem(item)) {
      words.set(token, (words.get(token) ?? 0) + 1);
    }
  }
  const topDomain = [...domains.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topDomain && topDomain[1] >= Math.max(2, Math.ceil(items.length * 0.45))) {
    const main = topDomain[0].split(".")[0] ?? topDomain[0];
    return main.charAt(0).toUpperCase() + main.slice(1);
  }
  const topWords = [...words.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  if (topWords.length > 0) return topWords.join(" ");
  return "Mixed Ideas";
}

type WorkingBucket = {
  id: string;
  parentClusterId: string | null;
  items: CanvasItem[];
};

function buildLevel(
  items: CanvasItem[],
  parentClusterId: string | null,
  depth: number,
): { clusters: ClusterNode[]; looseItems: CanvasItem[] } {
  const buckets: WorkingBucket[] = [];

  for (const item of items) {
    const itemTokens = tokensForItem(item);
    let best: WorkingBucket | null = null;
    let bestScore = -1;
    for (const bucket of buckets) {
      const score = jaccard(itemTokens, toCentroidTokenSet(bucket.items));
      if (score > bestScore) {
        best = bucket;
        bestScore = score;
      }
    }
    if (best && bestScore >= BASE_SIMILARITY_THRESHOLD) {
      best.items.push(item);
    } else {
      buckets.push({
        id: `cluster_${parentClusterId ?? "root"}_${depth}_${buckets.length + 1}`,
        parentClusterId,
        items: [item],
      });
    }
  }

  const clusters: ClusterNode[] = [];
  const looseItems: CanvasItem[] = [];

  for (const bucket of buckets) {
    if (bucket.items.length <= 1) {
      looseItems.push(...bucket.items);
      continue;
    }

    let baseItems = bucket.items;
    let subClusters: ClusterNode[] = [];
    if (bucket.items.length > CASCADE_SIZE_THRESHOLD && depth < MAX_CASCADE_DEPTH) {
      const cascade = buildLevel(bucket.items, bucket.id, depth + 1);
      if (cascade.clusters.length > 0) {
        subClusters = cascade.clusters;
        const nested = new Set(
          cascade.clusters.flatMap((sub) => collectClusterItems(sub).map((item) => item.id)),
        );
        baseItems = bucket.items.filter((item) => !nested.has(item.id));
      }
    }

    clusters.push({
      id: bucket.id,
      name: clusterName(bucket.items),
      items: baseItems,
      subClusters,
      parentClusterId: bucket.parentClusterId,
      embedding: null,
    });
  }

  return { clusters, looseItems };
}

function collectClusterItems(cluster: ClusterNode): CanvasItem[] {
  return [...cluster.items, ...cluster.subClusters.flatMap(collectClusterItems)];
}

function indexMembership(
  clusters: ClusterNode[],
  membership: Record<string, string | null>,
): void {
  for (const cluster of clusters) {
    for (const item of collectClusterItems(cluster)) {
      membership[item.id] = cluster.id;
    }
    indexMembership(cluster.subClusters, membership);
  }
}

export function toCanvasItem(link: LinkApiRow): CanvasItem {
  return {
    id: link.id,
    url: link.url,
    title: link.display_title,
    previewImage: link.image_url || null,
    tags: link.tags,
    embedding: null,
    createdAt: link.created_at,
  };
}

export function buildCascadingClusters(items: CanvasItem[]): ClusterBuildResult {
  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const { clusters, looseItems } = buildLevel(sorted, null, 0);
  const membership: Record<string, string | null> = {};
  for (const item of sorted) membership[item.id] = null;
  indexMembership(clusters, membership);
  return { clusters, uncategorizedItems: looseItems, membership };
}

export function findClusterById(
  clusters: ClusterNode[],
  id: string | null,
): ClusterNode | null {
  if (!id) return null;
  for (const cluster of clusters) {
    if (cluster.id === id) return cluster;
    const nested = findClusterById(cluster.subClusters, id);
    if (nested) return nested;
  }
  return null;
}
