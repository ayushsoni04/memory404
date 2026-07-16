import { NextResponse } from "next/server";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";
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
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });

  try {
    const [links, groups] = await Promise.all([
      prisma.link.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        include: { group: { select: { id: true, name: true, deletedAt: true } } },
      }),
      prisma.group.findMany({
        where: { deletedAt: { not: null } },
        orderBy: { deletedAt: "desc" },
        include: { _count: { select: { links: { where: { deletedAt: { not: null } } } } } },
      }),
    ]);

    const items: TrashApiItem[] = [
      ...groups.map((g): TrashGroupItem => ({
        type: "group",
        id: g.id,
        name: g.name,
        linksCount: g._count.links,
        deletedAt: g.deletedAt!.toISOString(),
        daysLeft: daysLeft(g.deletedAt!),
      })),
      ...links.map((l): TrashLinkItem => ({
        type: "link",
        id: l.id,
        url: l.url,
        title: l.title,
        displayTitle: l.customTitle ?? l.title,
        imageUrl: effectivePreviewImageUrl(l),
        faviconUrl: effectiveFaviconUrl(l),
        groupId: l.groupId,
        groupName: l.group.deletedAt ? null : l.group.name,
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
  const envErr = getDatabaseEnvError();
  if (envErr) return NextResponse.json({ error: envErr }, { status: 503 });

  try {
    const url = new URL(request.url);
    const expiredOnly = url.searchParams.get("expiredOnly") === "1";
    const cutoff = expiredOnly ? new Date(Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000) : undefined;

    const where = cutoff
      ? { deletedAt: { not: null, lte: cutoff } }
      : { deletedAt: { not: null } };

    // Links first (FK constraint: must delete before groups)
    const deletedLinks = await prisma.link.deleteMany({ where });
    // Now groups (links are gone, so Restrict FK is satisfied)
    const deletedGroups = await prisma.group.deleteMany({ where: cutoff ? { deletedAt: { not: null, lte: cutoff } } : { deletedAt: { not: null } } });

    return NextResponse.json({ ok: true, deletedLinks: deletedLinks.count, deletedGroups: deletedGroups.count });
  } catch (e) {
    console.error("DELETE /api/trash:", e);
    return NextResponse.json({ error: "Failed to empty Trash" }, { status: 500 });
  }
}
