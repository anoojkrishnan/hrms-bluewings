import { z } from 'zod';
import { ApproverType, WorkflowStatus } from './workflow.types';
import { paginationSchema } from '@/shared/validators/common.schemas';

const workflowStepSchema = z.object({
  stepIndex: z.number().int().min(0),
  name: z.string().min(1).max(255),
  approverType: z.nativeEnum(ApproverType),
  approverRef: z.string().optional(),
  slaHours: z.number().positive().optional(),
  autoApproveOnSla: z.boolean().optional(),
});

export const createWorkflowSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255),
    module: z.string().min(1).max(100),
    triggerEvent: z.string().optional(),
    isActive: z.boolean().optional(),
    steps: z.array(workflowStepSchema).optional().default([]),
  }),
});

export const updateWorkflowSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    isActive: z.boolean().optional(),
    steps: z.array(workflowStepSchema).min(1).optional(),
  }),
});

export const approveInstanceSchema = z.object({
  body: z.object({
    comment: z.string().max(1000).optional(),
  }),
});

export const rejectInstanceSchema = z.object({
  body: z.object({
    reason: z.string().min(1).max(1000),
  }),
});

export const listInstancesSchema = z.object({
  query: paginationSchema.extend({
    status: z.nativeEnum(WorkflowStatus).optional(),
    module: z.string().optional(),
    approverId: z.string().optional(),
  }),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>['body'];
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>['body'];
export type ApproveInstanceInput = z.infer<typeof approveInstanceSchema>['body'];
export type RejectInstanceInput = z.infer<typeof rejectInstanceSchema>['body'];
export type ListInstancesInput = z.infer<typeof listInstancesSchema>['query'];
