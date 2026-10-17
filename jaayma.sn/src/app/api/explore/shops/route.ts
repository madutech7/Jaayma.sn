import { NextRequest, NextResponse } from "next/server";
import { api } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const category = searchParams.get("cat") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);

  try {
    const result = await api.getExploreShops({ q, category, page, limit: 12 });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur explore boutiques";
    return NextResponse.json({ error: message, items: [], hasNextPage: false }, { status: 500 });
  }
}
