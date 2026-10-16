import { NextResponse } from "next/server";
import { activityTimeZone } from "@/lib/activity-grid";
import { requireAuth } from "@/lib/auth";
import { getCollections } from "@/lib/db/mongodb";
import { activeLibraryMatch } from "@/lib/stats-scope";

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const timeZone = activityTimeZone(new URL(request.url).searchParams.get("tz"));

  try {
    const { groups: groupsCollection, links } = await getCollections();
    const library = activeLibraryMatch(auth.id);
    const [totalLinks, totalGroups, groups, frequency] = await Promise.all([
      links.countDocuments(library),
      groupsCollection.countDocuments(library),
      groupsCollection
        .aggregate<{ _id: string; name: string; count: number }>([
          { $match: library },
          { $sort: { sortOrder: 1 } },
          {
            $lookup: {
              from: "links",
              let: { groupId: "$_id" },
              pipeline: [
                {
                  $match: {
                    ...library,
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
          // Days you added a link, including one you later moved to Trash.
          { $match: { userId: auth.id } },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                  timezone: timeZone,
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
