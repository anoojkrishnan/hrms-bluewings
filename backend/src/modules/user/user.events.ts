import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';

export const emitUserRegistered = (userId: string, tenantId: string): void => {
  eventBus.emit(EVENTS.USER_REGISTERED, { userId, tenantId });
};

export const emitUserEmailVerified = (userId: string): void => {
  eventBus.emit(EVENTS.USER_EMAIL_VERIFIED, { userId });
};
