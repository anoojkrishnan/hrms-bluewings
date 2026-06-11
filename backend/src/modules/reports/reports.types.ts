export enum ReportStatus {
  QUEUED     = 'queued',
  PROCESSING = 'processing',
  DONE       = 'done',
  FAILED     = 'failed',
}

export enum ReportCategory {
  HR        = 'hr',
  LEAVE     = 'leave',
  ATTENDANCE = 'attendance',
  PAYROLL   = 'payroll',
  FINANCE   = 'finance',
}

export interface ReportTemplate {
  key:         string;
  name:        string;
  description: string;
  category:    ReportCategory;
  params:      ReportParamDef[];
}

export interface ReportParamDef {
  key:      string;
  label:    string;
  type:     'string' | 'number' | 'date' | 'select';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ReportJob {
  _id?:         unknown;
  publicId:     string;
  tenantId:     string;
  organizationId?: string;
  templateKey:  string;
  params:       Record<string, unknown>;
  status:       ReportStatus;
  rowCount?:    number;
  errorMessage?: string;
  requestedBy:  string;
  isActive:     boolean;
  createdBy:    string;
  updatedBy:    string;
  deletedAt:    Date | null;
  createdAt?:   Date;
  completedAt?: Date;
}

export interface GenerateReportDto {
  templateKey: string;
  params:      Record<string, unknown>;
}
