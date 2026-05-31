import { get, getList, post, put, patch, del } from './client';

export interface Workflow {
  publicId: string;
  name: string;
  module: string;
  triggerEvent: string;
  isActive: boolean;
  steps: WorkflowStep[];
  version: number;
  createdAt: string;
}

export interface WorkflowStep {
  stepIndex: number;
  name: string;
  approverType: string;
  approverIds?: string[];
  slaHours?: number;
}

export interface WorkflowInstance {
  publicId: string;
  workflowId: string;
  module: string;
  entityType: string;
  entityPublicId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'escalated';
  currentStepIndex: number;
  steps: WorkflowInstanceStep[];
  completedAt?: string;
  createdAt: string;
  slaDeadline?: string;
}

export interface WorkflowInstanceStep {
  stepIndex: number;
  name: string;
  status: string;
  approverId?: string;
  approvedAt?: string;
  rejectedAt?: string;
  comment?: string;
}

export const workflowApi = {
  listWorkflows: (params?: { page?: number; limit?: number }) =>
    getList<Workflow>('/workflows', { params }),

  createWorkflow: (data: { name: string; module: string; triggerEvent?: string; isActive?: boolean }) =>
    post<Workflow>('/workflows', data),

  updateWorkflow: (publicId: string, data: Partial<Workflow>) =>
    put<Workflow>(`/workflows/${publicId}`, data),

  deleteWorkflow: (publicId: string) =>
    del<void>(`/workflows/${publicId}`),

  getApprovalQueue: (params?: { page?: number; limit?: number }) =>
    getList<WorkflowInstance>('/workflow-instances/queue', { params }),

  listInstances: (params?: { page?: number; limit?: number; status?: string; module?: string }) =>
    getList<WorkflowInstance>('/workflow-instances', { params }),

  getInstance: (publicId: string) =>
    get<WorkflowInstance>(`/workflow-instances/${publicId}`),

  approveInstance: (publicId: string, data: { comment?: string }) =>
    patch<WorkflowInstance>(`/workflow-instances/${publicId}/approve`, data),

  rejectInstance: (publicId: string, data: { reason: string }) =>
    patch<WorkflowInstance>(`/workflow-instances/${publicId}/reject`, data),

  cancelInstance: (publicId: string) =>
    patch<WorkflowInstance>(`/workflow-instances/${publicId}/cancel`),
};
