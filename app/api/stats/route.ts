import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getCollections } from "@/lib/db/mongodb";

export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  try {
    const { groups: groupsCollection, links } = await getCollections();
    const [totalLinks, totalGroups, groups, frequency] = await Promise.all([
      links.countDocuments({ userId: auth.id }),
      groupsCollection.countDocuments({ userId: auth.id }),
      groupsCollection
        .aggregate<{ _id: string; name: string; count: number }>([
          { $match: { userId: auth.id } },
          { $sort: { sortOrder: 1 } },
          {
            $lookup: {
              from: "links",
              let: { groupId: "$_id" },
              pipeline: [
                {
                  $match: {
                    userId: auth.id,
                    $expr: { $eq: ["$groupId", "$$groupId"] },
                  },
                },
                { $count: "value" },
              ],
              as: "linkCount",
            },
          },
          {
            $project: {
              name: 1,
              count: {
                $ifNull: [{ $arrayElemAt: ["$linkCount.value", 0] }, 0],
              },
            },
          },
        ])
        .toArray(),
      links
        .aggregate<{ date: string; count: number }>([
          { $match: { userId: auth.id } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", count: 1 } },
        ])
        .toArray(),
    ]);

    const linksByGroup = groups.map((g) => ({
      id: g._id,
      name: g.name,
      count: g.count
    }));

    const linkFrequency = frequency.map((f) => ({
      date: f.date,
      count: f.count,
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
