import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';

export const emitTenantCreated = (tenantId: string, slug: string): void => {
  eventBus.emit(EVENTS.TENANT_CREATED, { tenantId, slug });
};

export const emitTenantSuspended = (tenantId: string, reason?: string): void => {
  eventBus.emit(EVENTS.TENANT_SUSPENDED, { tenantId, reason });
};

export const emitTenantReactivated = (tenantId: string): void => {
  eventBus.emit(EVENTS.TENANT_REACTIVATED, { tenantId });
};
