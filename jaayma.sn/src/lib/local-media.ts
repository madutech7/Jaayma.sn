import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.join(process.cwd(), ".local-media");

export type MediaObject = {
  body: Uint8Array;
  writeHttpMetadata: (headers: Headers) => void;
};

export type MediaBucket = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView,
    options?: { httpMetadata?: { contentType?: string } }
  ) => Promise<void>;
  get: (key: string) => Promise<MediaObject | null>;
};

function safeKeyPath(key: string): string {
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Clé image invalide.");
  }
  return path.join(ROOT, ...normalized.split("/"));
}

export function createLocalMediaBucket(): MediaBucket {
  return {
    async put(key, value, options) {
      const filePath = safeKeyPath(key);
      await mkdir(path.dirname(filePath), { recursive: true });
      const buffer = Buffer.from(
        ArrayBuffer.isView(value)
          ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
          : new Uint8Array(value)
      );
      await writeFile(filePath, buffer);
      const metaPath = `${filePath}.meta.json`;
      await writeFile(
        metaPath,
        JSON.stringify({ contentType: options?.httpMetadata?.contentType || "application/octet-stream" })
      );
    },
    async get(key) {
      const filePath = safeKeyPath(key);
      try {
        const body = await readFile(filePath);
        let contentType = "application/octet-stream";
        try {
          const meta = JSON.parse(await readFile(`${filePath}.meta.json`, "utf8")) as {
            contentType?: string;
          };
          if (meta.contentType) contentType = meta.contentType;
        } catch {
          /* no metadata */
        }
        return {
          body: new Uint8Array(body),
          writeHttpMetadata(headers: Headers) {
            headers.set("content-type", contentType);
          },
        };
      } catch {
        return null;
      }
    },
  };
}
