export interface IEventPublisher {
  publish(topic: string, data: Record<string, unknown>): Promise<void>;
}
