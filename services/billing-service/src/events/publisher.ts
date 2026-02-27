import http from "http";

// ---------------------------------------------------------------------------
// Dapr pub/sub publisher
//
// Publishes events to the Dapr sidecar via its HTTP API.
// The sidecar listens on DAPR_HTTP_PORT (default 3500) on localhost because
// it shares the service container's network namespace.
// ---------------------------------------------------------------------------

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT ?? "3500";
const PUBSUB_NAME = "car-erp-pubsub";

export async function publishEvent(
  topic: string,
  data: Record<string, unknown>
): Promise<void> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(data);

    const options: http.RequestOptions = {
      hostname: "localhost",
      port: parseInt(DAPR_HTTP_PORT, 10),
      path: `/v1.0/publish/${PUBSUB_NAME}/${topic}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = http.request(options, (res) => {
      // Consume response body to free the socket
      res.resume();
      if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[publisher] Published event to topic "${topic}" (HTTP ${res.statusCode})`);
        resolve();
      } else {
        reject(
          new Error(
            `Dapr publish failed for topic "${topic}": HTTP ${res.statusCode}`
          )
        );
      }
    });

    req.on("error", (err) => {
      console.error(`[publisher] Failed to publish event to topic "${topic}":`, err.message);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}
