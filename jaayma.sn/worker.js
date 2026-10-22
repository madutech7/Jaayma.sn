import handler, {
  DOQueueHandler,
  DOShardedTagCache,
  BucketCachePurge,
} from "./.open-next/worker.js";

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge };

export default {
  ...handler,

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      (async () => {
        const backendUrl =
          (typeof env.API_BASE_URL === "string" && env.API_BASE_URL) ||
          (typeof env.NEXT_PUBLIC_API_URL === "string" && env.NEXT_PUBLIC_API_URL) ||
          "https://madutech7-jaaymaa.hf.space";

        const targetUrl = `${backendUrl.replace(/\/$/, "")}/health`;

        try {
          console.log(`[Cron ${controller.cron}] Pinging backend keepalive: ${targetUrl}`);
          const start = Date.now();
          const response = await fetch(targetUrl, {
            headers: {
              "User-Agent": "Jaayma-Cloudflare-Cron/1.0",
            },
          });
          const duration = Date.now() - start;
          console.log(`[Cron keepalive] Response: ${response.status} in ${duration}ms`);
        } catch (error) {
          console.error("[Cron keepalive] Ping failed:", error);
        }
      })()
    );
  },
};
