const MAX_EDGE = 1600;
const TARGET_BYTES = 200 * 1024;
const MIN_QUALITY = 0.5;

function canCompressInBrowser(): boolean {
  return typeof document !== "undefined" && typeof createImageBitmap === "function";
}

async function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/jpeg", quality);
  });
  if (!blob) {
    throw new Error("Impossible de compresser l'image.");
  }
  return blob;
}

/**
 * Shrinks and converts a photo to JPEG so phone camera files (HEIC, 4–12 MB)
 * can be uploaded from mobile browsers.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!canCompressInBrowser()) return file;
  if (file.size <= TARGET_BYTES && /image\/(jpeg|jpg|png|webp)/i.test(file.type)) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let blob = await canvasToJpegBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > MIN_QUALITY) {
    quality -= 0.12;
    blob = await canvasToJpegBlob(canvas, quality);
  }

  const name = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
}
