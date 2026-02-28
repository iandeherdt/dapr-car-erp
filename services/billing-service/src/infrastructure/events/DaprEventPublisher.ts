import http from 'http';
import { IEventPublisher } from '../../domain/events/IEventPublisher';

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT ?? '3500';
const PUBSUB_NAME = 'car-erp-pubsub';

export class DaprEventPublisher implements IEventPublisher {
  async publish(topic: string, data: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify(data);
      const options: http.RequestOptions = {
        hostname: 'localhost',
        port: parseInt(DAPR_HTTP_PORT, 10),
        path: `/v1.0/publish/${PUBSUB_NAME}/${topic}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = http.request(options, (res) => {
        res.resume();
        if (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          reject(new Error(`Dapr publish failed for topic "${topic}": HTTP ${res.statusCode}`));
        }
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });
  }
}
