import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const totalLinks = await prisma.link.count({ where: { userId: auth.id } });
    const totalGroups = await prisma.group.count({ where: { userId: auth.id } });

    // Link counts by group
    const groups = await prisma.group.findMany({
      where: { userId: auth.id },
      select: {
        id: true,
        name: true,
        _count: {
          select: { links: true }
        }
      },
      orderBy: { sortOrder: "asc" }
    });

    const linksByGroup = groups.map((g) => ({
      id: g.id,
      name: g.name,
      count: g._count.links
    }));

    // Daily creation count — aggregated in SQL instead of pulling every row.
    const frequency = await prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT date_trunc('day', "created_at")::date::text AS date,
             COUNT(*) AS count
      FROM "links"
      WHERE "user_id" = ${auth.id}::uuid
      GROUP BY 1
      ORDER BY 1
    `;
    const linkFrequency = frequency.map((f) => ({
      date: f.date,
      count: Number(f.count),
    }));

    return NextResponse.json({
      success: true,
      totalLinks,
      totalGroups,
      linksByGroup,
      linkFrequency
    });
  } catch (error) {
    console.error("[api/stats] error", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
