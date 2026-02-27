import { randomUUID } from 'crypto';
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'billing-service' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: () => `,"@timestamp":"${new Date().toISOString()}"`,
});

export function withCorrelation(correlationId: string, action: string) {
  return logger.child({ correlationId, action });
}

/** Wraps a gRPC service handler map with request/response logging middleware. */
export function withServiceLogging<T extends Record<string, unknown>>(impl: T): T {
  return new Proxy(impl, {
    get(target, prop: string | symbol) {
      const fn = (target as Record<string | symbol, unknown>)[prop];
      if (typeof fn !== 'function') return fn;
      return function (call: any, callback: any) {
        const metaValues = call.metadata?.get?.('x-correlation-id') as string[] | undefined;
        const correlationId = metaValues?.[0] ?? randomUUID();
        const action = String(prop);
        const log = logger.child({ correlationId });
        log.info({ action: `${action}.called` }, `${action} called`);
        const wrappedCb = (err: any, ...rest: any[]) => {
          if (err) {
            const level = err.code === 13 ? 'error' : 'warn';
            log[level]({ action: `${action}.failed`, grpcCode: err.code }, `${action} failed: ${err.message}`);
          } else {
            log.info({ action: `${action}.completed` }, `${action} completed`);
          }
          if (typeof callback === 'function') callback(err, ...rest);
        };
        const result = (fn as Function).call(target, call, wrappedCb);
        if (result && typeof (result as any).catch === 'function') {
          (result as Promise<unknown>).catch((err: any) => {
            log.error({ action: `${action}.failed`, error: { message: err?.message } }, `${action} uncaught error`);
          });
        }
        return result;
      };
    },
  }) as T;
}
