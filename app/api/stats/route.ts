import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const totalLinks = await prisma.link.count();
    const totalGroups = await prisma.group.count();

    // Link counts by group
    const groups = await prisma.group.findMany({
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

    // Daily creation count
    const links = await prisma.link.findMany({
      select: { createdAt: true },
      orderBy: { createdAt: "asc" }
    });

    const frequencyMap: Record<string, number> = {};
    links.forEach((l) => {
      // Format to YYYY-MM-DD
      try {
        const dateStr = new Date(l.createdAt).toISOString().slice(0, 10);
        frequencyMap[dateStr] = (frequencyMap[dateStr] || 0) + 1;
      } catch {
        /* ignore invalid date parse */
      }
    });

    const linkFrequency = Object.entries(frequencyMap).map(([date, count]) => ({
      date,
      count
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
