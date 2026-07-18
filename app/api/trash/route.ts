import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getCollections,
  getMongoEnvError,
  withMongoTransaction,
} from "@/lib/db/mongodb";
import { rateLimit } from "@/lib/rate-limit";
import { effectivePreviewImageUrl, effectiveFaviconUrl } from "@/lib/links";

export const runtime = "nodejs";

export type TrashLinkItem = {
  type: "link";
  id: string;
  url: string;
  title: string;
  displayTitle: string;
  imageUrl: string;
  faviconUrl: string;
  groupId: string;
  groupName: string | null;
  deletedAt: string;
  daysLeft: number;
};

export type TrashGroupItem = {
  type: "group";
  id: string;
  name: string;
  linksCount: number;
  deletedAt: string;
  daysLeft: number;
};

export type TrashApiItem = TrashLinkItem | TrashGroupItem;

const TRASH_DAYS = 30;

function daysLeft(deletedAt: Date): number {
  const expiresMs = deletedAt.getTime() + TRASH_DAYS * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
}

export async function GET() {
  const envErr = getMongoEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { groups: groupsCollection, links: linksCollection } =
      await getCollections();
    const [links, allGroups] = await Promise.all([
      linksCollection
        .find({ userId: auth.id, deletedAt: { $ne: null } })
        .sort({ deletedAt: -1 })
        .toArray(),
      groupsCollection.find({ userId: auth.id }).toArray(),
    ]);
    const groups = allGroups
      .filter((group) => group.deletedAt !== null)
      .sort(
        (a, b) =>
          (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0),
      );
    const groupById = new Map(allGroups.map((group) => [group._id, group]));
    const trashedLinksByGroup = new Map<string, number>();
    for (const link of links) {
      trashedLinksByGroup.set(
        link.groupId,
        (trashedLinksByGroup.get(link.groupId) ?? 0) + 1,
      );
    }

    const items: TrashApiItem[] = [
      ...groups.map((g): TrashGroupItem => ({
        type: "group",
        id: g._id,
        name: g.name,
        linksCount: trashedLinksByGroup.get(g._id) ?? 0,
        deletedAt: g.deletedAt!.toISOString(),
        daysLeft: daysLeft(g.deletedAt!),
      })),
      ...links.map((l): TrashLinkItem => ({
        type: "link",
        id: l._id,
        url: l.url,
        title: l.title,
        displayTitle: l.customTitle ?? l.title,
        imageUrl: effectivePreviewImageUrl(l),
        faviconUrl: effectiveFaviconUrl(l),
        groupId: l.groupId,
        groupName:
          groupById.get(l.groupId)?.deletedAt === null
            ? (groupById.get(l.groupId)?.name ?? null)
            : null,
        deletedAt: l.deletedAt!.toISOString(),
        daysLeft: daysLeft(l.deletedAt!),
      })),
    ];

    return NextResponse.json({ items });
  } catch (e) {
    console.error("GET /api/trash:", e);
    return NextResponse.json({ error: "Failed to load trash" }, { status: 500 });
  }
}

// DELETE /api/trash — permanently purge all (or expired-only via ?expiredOnly=1)
export async function DELETE(request: Request) {
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.json(
      { error: "Service is temporarily unavailable during maintenance." },
      { status: 503 },
    );
  }
  const envErr = getMongoEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });

  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const limit = rateLimit(`trash:purge:${auth.id}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many purge requests, please slow down." },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  try {
    const url = new URL(request.url);
    const expiredOnly = url.searchParams.get("expiredOnly") === "1";
    const cutoff = expiredOnly ? new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000) : undefined;

    const deletedAt = cutoff ? { $ne: null, $lte: cutoff } : { $ne: null };
    const { deletedLinks, deletedGroups } = await withMongoTransaction(
      async (session) => {
        const { groups, links } = await getCollections();
        const groupIds = await groups
          .find(
            { userId: auth.id, deletedAt },
            { session, projection: { _id: 1 } },
          )
          .map((group) => group._id)
          .toArray();
        const linkFilter = groupIds.length
          ? {
              userId: auth.id,
              $or: [
                { deletedAt },
                { groupId: { $in: groupIds } },
              ],
            }
          : { userId: auth.id, deletedAt };
        const linksResult = await links.deleteMany(linkFilter, { session });
        const groupsResult = await groups.deleteMany(
          { userId: auth.id, deletedAt },
          { session },
        );
        return {
          deletedLinks: linksResult.deletedCount,
          deletedGroups: groupsResult.deletedCount,
        };
      },
    );

    return NextResponse.json({ ok: true, deletedLinks, deletedGroups });
  } catch (e) {
    console.error("DELETE /api/trash:", e);
    return NextResponse.json({ error: "Failed to empty Trash" }, { status: 500 });
  }
}
