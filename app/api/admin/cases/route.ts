import { NextResponse } from "next/server";
import { listCases } from "@/lib/cases";
import { isAdmin } from "@/lib/request";
import type { CaseStatus } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const status = (url.searchParams.get("status") ?? "all") as CaseStatus | "all";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const data = await listCases({ sort: "new", status, q: url.searchParams.get("q") ?? "", page, perPage: 40 });
  return NextResponse.json(data);
}
