import { NextResponse } from "next/server";
import { deleteCase, getCase, setStatus } from "@/lib/cases";
import { removeProofs } from "@/lib/uploads";
import { isAdmin } from "@/lib/request";
import { STATUS_ORDER, type CaseStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { status?: string; note?: string };

  if (!STATUS_ORDER.includes(body.status as CaseStatus)) {
    return NextResponse.json({ error: "Unknown status" }, { status: 400 });
  }
  const updated = await setStatus(id, body.status as CaseStatus, body.note?.slice(0, 500) ?? null);
  if (!updated) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  return NextResponse.json({ case: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await getCase(id))) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  const paths = await deleteCase(id);
  await removeProofs(paths);
  return NextResponse.json({ ok: true });
}
