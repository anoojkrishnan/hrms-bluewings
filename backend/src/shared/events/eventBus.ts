import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

class TypedEventBus extends EventEmitter {
  emit<T>(event: string, payload: T): boolean {
    return super.emit(event, payload);
  }

  on<T>(event: string, handler: (payload: T) => void): this {
    const safeHandler = (payload: T) => {
      try {
        handler(payload);
      } catch (err) {
        logger.error({ err, event }, 'Event handler threw an error');
      }
    };
    return super.on(event, safeHandler);
  }

  once<T>(event: string, handler: (payload: T) => void): this {
    const safeHandler = (payload: T) => {
      try {
        handler(payload);
      } catch (err) {
        logger.error({ err, event }, 'Event handler threw an error');
      }
    };
    return super.once(event, safeHandler);
  }
}

export const eventBus = new TypedEventBus();
eventBus.setMaxListeners(50);
