const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';
const PUBSUB_NAME = 'car-erp-pubsub';
const DAPR_BASE_URL = `http://localhost:${DAPR_HTTP_PORT}/v1.0/publish/${PUBSUB_NAME}`;

export async function publishEvent(topic: string, data: unknown): Promise<void> {
  const url = `${DAPR_BASE_URL}/${topic}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[publisher] Failed to publish event to topic "${topic}": ${response.status} ${text}`);
    } else {
      console.log(`[publisher] Event published to topic "${topic}"`);
    }
  } catch (err) {
    console.error(`[publisher] Error publishing event to topic "${topic}":`, err);
  }
}
