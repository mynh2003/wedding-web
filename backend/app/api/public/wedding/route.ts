import { NextResponse } from "next/server";
import { getPublicWedding } from "@/lib/wedding-public";
import { buildWeddingPresentation } from "@/lib/wedding-presentation";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get("slug");
  if (slug !== null && (!slug.trim() || slug.length > 200)) {
    return NextResponse.json({ error: "Không tìm thấy thiệp mời." }, { status: 404, headers });
  }
  try {
    const data = await getPublicWedding(slug ?? undefined);
    return NextResponse.json({ data, presentation: buildWeddingPresentation(data) }, { headers });
  } catch {
    return NextResponse.json({ error: "Không thể tải thiệp mời." }, { status: 500, headers });
  }
}
