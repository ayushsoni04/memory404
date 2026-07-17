import { requireAuth } from "@/lib/auth";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";
import { toLinksPage } from "@/lib/links-pagination";
import { startTimer } from "@/lib/perf";
import type {
  GroupRow,
  InitialVaultData,
} from "@/components/vault/types";

// Covers the initial viewport for Medium/Large grids without hydrating a
// full 24-card page. Infinite scroll fetches the next page after first paint.
const FIRST_PAGE_SIZE = 12;

function emptyInitialData(): InitialVaultData {
  return {
    groups: [],
    openedGroupId: "all",
    firstPage: {
      links: [],
      nextCursor: null,
      hasMore: false,
    },
  };
}

export async function getInitialVaultData(
  preferredGroupId: string | null,
): Promise<InitialVaultData> {
  if (getDatabaseEnvError()) return emptyInitialData();

  const auth = await requireAuth();
  if (auth instanceof Response) return emptyInitialData();

  const timer = startTimer();
  const requestedGroupId =
    preferredGroupId && preferredGroupId !== "all"
      ? preferredGroupId
      : "all";

  try {
    const [groupRows, initialLinkRows] = await Promise.all([
      prisma.group.findMany({
        where: { userId: auth.id, deletedAt: null },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          _count: { select: { links: { where: { deletedAt: null } } } },
          links: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              title: true,
              customTitle: true,
              url: true,
            },
          },
        },
      }),
      prisma.link.findMany({
        where: {
          userId: auth.id,
          deletedAt: null,
          ...(requestedGroupId === "all"
            ? {}
            : { groupId: requestedGroupId }),
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: FIRST_PAGE_SIZE + 1,
      }),
    ]);
    timer.mark("query");

    const groups: GroupRow[] = groupRows.map((group) => ({
      id: group.id,
      name: group.name,
      createdAt: group.createdAt.toISOString(),
      linksCount: group._count.links,
      previewTitles: group.links.map(
        (link) => link.customTitle ?? link.title ?? link.url,
      ),
      sortOrder: group.sortOrder,
    }));

    const groupExists =
      requestedGroupId === "all" ||
      groups.some((group) => group.id === requestedGroupId);
    const openedGroupId = groupExists ? requestedGroupId : "all";
    let linkRows = initialLinkRows;
    if (!groupExists) {
      linkRows = await prisma.link.findMany({
        where: { userId: auth.id, deletedAt: null },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: FIRST_PAGE_SIZE + 1,
      });
      timer.mark("fallbackQuery");
    }

    const firstPage = toLinksPage(linkRows, FIRST_PAGE_SIZE);
    timer.mark("transform");
    timer.done("getInitialVaultData");

    return {
      groups,
      openedGroupId,
      firstPage,
    };
  } catch (error) {
    console.error("Failed to server-render vault data:", error);
    return emptyInitialData();
  }
}
