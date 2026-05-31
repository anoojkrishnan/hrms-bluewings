import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';

export const emitRoleAssigned = (userId: string, tenantId: string, roleCode: string): void => {
  eventBus.emit(EVENTS.ROLE_ASSIGNED, { userId, tenantId, roleCode });
};

export const emitRoleRevoked = (userId: string, tenantId: string, roleCode: string): void => {
  eventBus.emit(EVENTS.ROLE_REVOKED, { userId, tenantId, roleCode });
};
