import { Router } from 'express';
import { WorkflowController } from './workflow.controller';
import { requireAuth } from '@/middleware/auth.middleware';
import { requireTenantContext } from '@/middleware/tenantContext.middleware';
import { requirePermission } from '@/middleware/permission.middleware';
import { validate } from '@/shared/validators/common.schemas';
import { WorkflowPermissions as P } from './workflow.permissions';
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  approveInstanceSchema,
  rejectInstanceSchema,
  listInstancesSchema,
} from './workflow.validator';

const router = Router();
const ctrl = new WorkflowController();

router.use(requireAuth, requireTenantContext);

// ── Workflows ─────────────────────────────────────────────────────────────────
router.get('/workflows', requirePermission(P.VIEW), ctrl.listWorkflows);
router.post('/workflows', requirePermission(P.CONFIGURE), validate(createWorkflowSchema), ctrl.createWorkflow);
router.put('/workflows/:publicId', requirePermission(P.CONFIGURE), validate(updateWorkflowSchema), ctrl.updateWorkflow);
router.delete('/workflows/:publicId', requirePermission(P.CONFIGURE), ctrl.deleteWorkflow);

// ── Workflow Instances ────────────────────────────────────────────────────────
// NOTE: /queue must be declared before /:publicId to avoid route shadowing
router.get('/workflow-instances/queue', ctrl.getApprovalQueue);
router.get('/workflow-instances', requirePermission(P.INSTANCE_VIEW), validate(listInstancesSchema), ctrl.listInstances);
router.get('/workflow-instances/:publicId', requirePermission(P.INSTANCE_VIEW), ctrl.getInstance);
router.patch('/workflow-instances/:publicId/approve', requirePermission(P.INSTANCE_APPROVE), validate(approveInstanceSchema), ctrl.approveInstance);
router.patch('/workflow-instances/:publicId/reject', requirePermission(P.INSTANCE_APPROVE), validate(rejectInstanceSchema), ctrl.rejectInstance);
router.patch('/workflow-instances/:publicId/cancel', ctrl.cancelInstance);

export { router as workflowRouter };
