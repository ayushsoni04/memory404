import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getOrCreateUncategorizedGroupId } from "@/lib/groups";
import { getDatabaseEnvError, prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type PostBody = {
  name?: unknown;
};

export async function GET() {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  try {
    await getOrCreateUncategorizedGroupId();
    const groups = await prisma.group.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        _count: { select: { links: true } },
        links: {
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            title: true,
            customTitle: true,
            url: true,
          },
        },
      },
    });
    return NextResponse.json({
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        createdAt: g.createdAt.toISOString(),
        linksCount: g._count.links,
        previewTitles: g.links.map((l) => l.customTitle ?? l.title ?? l.url),
      })),
    });
  } catch (e) {
    console.error("GET /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to load groups" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const envErr = getDatabaseEnvError();
  if (envErr) {
    return NextResponse.json({ error: envErr }, { status: 503 });
  }

  try {
    let body: PostBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 },
      );
    }

    const created = await prisma.group.create({
      data: { name },
    });

    return NextResponse.json(
      {
        group: {
          id: created.id,
          name: created.name,
          createdAt: created.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "A group with this name already exists." },
        { status: 409 },
      );
    }
    console.error("POST /api/groups:", e);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 },
    );
  }
}
