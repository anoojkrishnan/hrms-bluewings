export const WorkflowPermissions = {
  VIEW: 'workflow.view',
  CONFIGURE: 'workflow.configure',
  INSTANCE_VIEW: 'workflow.instance.view',
  INSTANCE_APPROVE: 'workflow.instance.approve',
} as const;

export type WorkflowPermission = (typeof WorkflowPermissions)[keyof typeof WorkflowPermissions];
