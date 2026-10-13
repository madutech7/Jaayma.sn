import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createLocalMediaBucket, type MediaBucket } from "@/lib/local-media";

type EnvWithMedia = {
  MEDIA?: MediaBucket;
};

let localBucket: MediaBucket | null = null;

function getLocalBucket(): MediaBucket {
  if (!localBucket) localBucket = createLocalMediaBucket();
  return localBucket;
}

function isUsableBucket(bucket: MediaBucket | undefined): bucket is MediaBucket {
  return Boolean(bucket && typeof bucket.put === "function" && typeof bucket.get === "function");
}

export async function getMediaBucket(): Promise<MediaBucket> {
  const local = getLocalBucket();
  let remote: MediaBucket | null = null;

  try {
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as EnvWithMedia).MEDIA;
    if (isUsableBucket(bucket)) {
      remote = bucket;
    }
  } catch {
    /* next dev without a live R2 binding */
  }

  if (!remote) return local;

  return {
    async put(key, value, options) {
      try {
        await remote.put(key, value, options);
      } catch {
        await local.put(key, value, options);
      }
    },
    async get(key) {
      try {
        const fromRemote = await remote.get(key);
        if (fromRemote) return fromRemote;
      } catch {
        /* fall through to disk */
      }
      return local.get(key);
    },
  };
}
