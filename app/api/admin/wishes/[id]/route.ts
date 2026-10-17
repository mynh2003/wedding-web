import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null) as { status?: string } | null;
  if (!body || !["approved", "rejected", "pending"].includes(body.status ?? "")) return NextResponse.json({ error: "Trạng thái không hợp lệ." }, { status: 400 });
  const { error } = await context.supabase.from("wishes").update({ status: body.status, reviewed_at: body.status === "pending" ? null : new Date().toISOString() }).eq("id", id).eq("wedding_id", context.admin.wedding_id);
  if (error) return NextResponse.json({ error: "Không thể cập nhật lời chúc." }, { status: 500 });
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAdmin();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { error } = await context.supabase.from("wishes").delete().eq("id", id).eq("wedding_id", context.admin.wedding_id);
  if (error) return NextResponse.json({ error: "Không thể xóa lời chúc." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
