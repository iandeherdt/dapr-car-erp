import type { EventMap } from '@car-erp/shared-types';

class EventBus {
  emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    window.dispatchEvent(new CustomEvent(event as string, { detail: data }));
  }

  on<K extends keyof EventMap>(
    event: K,
    handler: (data: EventMap[K]) => void,
  ): () => void {
    const listener = (e: Event) => handler((e as CustomEvent<EventMap[K]>).detail);
    window.addEventListener(event as string, listener);
    return () => window.removeEventListener(event as string, listener);
  }
}

export const eventBus = new EventBus();
export type { EventMap };
