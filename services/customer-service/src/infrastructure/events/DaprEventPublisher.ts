import { IEventPublisher } from '../../domain/events/IEventPublisher.js';

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';
const PUBSUB_NAME = 'car-erp-pubsub';
const DAPR_BASE_URL = `http://localhost:${DAPR_HTTP_PORT}/v1.0/publish/${PUBSUB_NAME}`;

export class DaprEventPublisher implements IEventPublisher {
  async publish(topic: string, data: Record<string, unknown>): Promise<void> {
    const url = `${DAPR_BASE_URL}/${topic}`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[DaprEventPublisher] Failed to publish to "${topic}": ${response.status} ${text}`);
      }
    } catch (err) {
      console.error(`[DaprEventPublisher] Error publishing to "${topic}":`, err);
    }
  }
}
