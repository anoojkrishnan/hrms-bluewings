import type { BaseDocument } from '@/shared/types/common';

export enum WorkflowStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  ESCALATED = 'escalated',
}

export enum ApproverType {
  SPECIFIC_USER = 'specific_user',
  ROLE = 'role',
  REPORTING_MANAGER = 'reporting_manager',
  DEPARTMENT_HEAD = 'department_head',
}

export interface WorkflowStep {
  stepIndex: number;
  name: string;
  approverType: ApproverType;
  approverRef?: string; // userId or roleCode depending on type
  slaHours?: number;
  autoApproveOnSla?: boolean;
}

export interface Workflow extends BaseDocument {
  name: string;
  module: string; // 'leave', 'attendance', etc.
  isActive: boolean;
  version: number;
  steps: WorkflowStep[];
}

export interface WorkflowInstanceStep {
  stepIndex: number;
  approverId?: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  actedAt?: Date;
  comment?: string;
}

export interface WorkflowInstance extends BaseDocument {
  workflowId: string;
  workflowVersion: number;
  module: string;
  entityType: string;
  entityPublicId: string;
  requestedBy: string; // userId
  currentStepIndex: number;
  status: WorkflowStatus;
  steps: WorkflowInstanceStep[];
  slaDeadline?: Date;
  completedAt?: Date;
}

export interface CreateWorkflowDto {
  name: string;
  module: string;
  steps: WorkflowStep[];
}

export interface UpdateWorkflowDto {
  name?: string;
  isActive?: boolean;
  steps?: WorkflowStep[];
}

export interface StartInstanceDto {
  module: string;
  entityType: string;
  entityPublicId: string;
  requestedBy: string;
}
