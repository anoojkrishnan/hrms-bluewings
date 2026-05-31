export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  BULK_IMPORT: 'bulk-import',
  REPORT_GENERATION: 'report-generation',
  DOCUMENT_GENERATION: 'document-generation',
  TENANT_EXPORT: 'tenant-export',
  PAYROLL_PROCESSING: 'payroll-processing',
  PAYROLL_SIMULATION: 'payroll-simulation',
  ATTENDANCE_SYNC: 'attendance-sync',
  ACCOUNTING_EXPORT: 'accounting-export',
  WORKFLOW_ESCALATION: 'workflow-escalation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
