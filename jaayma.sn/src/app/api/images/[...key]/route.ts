import { NextRequest, NextResponse } from "next/server";
import { getMediaBucket } from "@/lib/r2";

export const runtime = "nodejs";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://madutech7-jaaymaa.hf.space"
    : "http://127.0.0.1:4000");

async function getLegacyImage(key: string): Promise<NextResponse | null> {
  try {
    const object = await (await getMediaBucket()).get(key);
    if (!object) return null;

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    return new NextResponse(object.body as BodyInit, { headers });
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  let key = "";
  try {
    const { key: keyParts } = await params;
    key = keyParts.join("/");
    if (!key || keyParts.some((part) => part === "." || part === "..")) {
      return new NextResponse("Image introuvable", { status: 404 });
    }

    const encodedKey = keyParts.map(encodeURIComponent).join("/");
    const neonResponse = await fetch(
      `${API_BASE_URL.replace(/\/$/, "")}/uploads/file/${encodedKey}`,
      { cache: "no-store" }
    );

    if (neonResponse.ok && neonResponse.body) {
      const headers = new Headers();
      const contentType = neonResponse.headers.get("content-type");
      const cacheControl = neonResponse.headers.get("cache-control");
      if (contentType) headers.set("content-type", contentType);
      if (cacheControl) headers.set("cache-control", cacheControl);
      return new NextResponse(neonResponse.body, { headers });
    }

    const legacyImage = await getLegacyImage(key);
    if (legacyImage) return legacyImage;

    return new NextResponse("Image introuvable", { status: 404 });
  } catch (error) {
    console.error("Image serve error:", error);
    const legacyImage = key ? await getLegacyImage(key) : null;
    return legacyImage ?? new NextResponse("Erreur serveur", { status: 500 });
  }
}
