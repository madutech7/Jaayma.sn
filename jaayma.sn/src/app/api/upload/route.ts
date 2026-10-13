import { NextRequest, NextResponse } from "next/server";
import { getCurrentSellerId } from "@/lib/auth";
import { api } from "@/lib/api";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "heic", "heif"]);
const ALLOWED_FOLDERS = new Set(["logos", "covers", "products", "misc"]);
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

function resolveImageType(file: File): { mimeType: string; extension: string } {
  const mimeType = file.type?.toLowerCase() || "";
  const lowerName = file.name?.toLowerCase() || "";
  const extension = lowerName.includes(".") ? lowerName.split(".").pop() || "" : "";

  if (mimeType && ALLOWED_TYPES.has(mimeType)) {
    const ext = mimeType.split("/")[1]?.replace("jpeg", "jpg") || extension;
    return { mimeType, extension: ext || "jpg" };
  }

  if (extension && ALLOWED_EXTENSIONS.has(extension)) {
    const normalizedMime =
      extension === "jpg" || extension === "jpeg"
        ? "image/jpeg"
        : extension === "heic"
          ? "image/heic"
          : extension === "heif"
            ? "image/heif"
            : `image/${extension}`;

    return { mimeType: normalizedMime, extension };
  }

  throw new Error("Type de fichier non supporté.");
}

export async function POST(request: NextRequest) {
  try {
    const sellerId = await getCurrentSellerId();
    if (!sellerId) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const rawFolder = (formData.get("folder") as string) || "misc";
    const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : "misc";

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
    }

    let imageMeta: { mimeType: string; extension: string };
    try {
      imageMeta = resolveImageType(file);
    } catch {
      return NextResponse.json(
        { error: "Type de fichier non supporté. Utilisez JPEG, PNG, WebP, AVIF, HEIC ou HEIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Le fichier est trop grand (max 8 MB)." },
        { status: 400 }
      );
    }

    const upload = await api.createImageUpload({
      ownerId: sellerId,
      folder,
      fileName: file.name || `image.${imageMeta.extension}`,
      contentType: imageMeta.mimeType,
    });

    const uploadResponse = await fetch(upload.uploadUrl, {
      method: upload.method,
      headers: upload.headers,
      body: await file.arrayBuffer(),
      cache: "no-store",
    });

    if (!uploadResponse.ok) {
      throw new Error(`Neon Storage upload failed (${uploadResponse.status}).`);
    }

    return NextResponse.json({ key: upload.key });
  } catch (error) {
    console.error("Upload error:", error);
    const errorText = error instanceof Error ? error.message : "";
    const message = /storage|neon|aws|s3/i.test(errorText)
      ? "Le stockage d'images Neon a refusé l'envoi. Vérifiez la configuration de stockage dans le .env du backend."
      : "Erreur lors de l'upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
