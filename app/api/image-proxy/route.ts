import { NextRequest, NextResponse } from "next/server";
import { fetchPublicImage } from "@/lib/safe-url";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const targetUrl = new URL(req.url).searchParams.get("url");
  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const result = await fetchPublicImage(targetUrl);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new Response(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
