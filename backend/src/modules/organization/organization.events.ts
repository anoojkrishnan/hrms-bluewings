import { eventBus } from '@/shared/events/eventBus';
import { EVENTS } from '@/shared/events/events';

export function registerOrganizationEventHandlers(): void {
  eventBus.on(EVENTS.COMPANY_CREATED, (payload: { companyId: string; tenantId: string }) => {
    // placeholder: future notifications / setup tasks
    void payload;
  });

  eventBus.on(EVENTS.DEPARTMENT_CREATED, (payload: { departmentId: string; tenantId: string }) => {
    void payload;
  });
}
