import { NextResponse } from "next/server";
import { addSupport } from "@/lib/cases";
import { visitorId } from "@/lib/request";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await addSupport(id, visitorId(req));
  if (!res.ok) return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  return NextResponse.json({ supports: res.supports, already: res.already });
}
