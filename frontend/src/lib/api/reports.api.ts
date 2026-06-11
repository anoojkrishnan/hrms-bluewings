import { get, post } from './client';

export interface ReportParamDef {
  key:      string;
  label:    string;
  type:     'string' | 'number' | 'date' | 'select';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
}

export interface ReportTemplate {
  key:         string;
  name:        string;
  description: string;
  category:    string;
  params:      ReportParamDef[];
}

export interface ReportJob {
  publicId:    string;
  templateKey: string;
  params:      Record<string, unknown>;
  status:      'queued' | 'processing' | 'done' | 'failed';
  rowCount?:   number;
  errorMessage?: string;
  createdAt:   string;
  completedAt?: string;
}

export interface ReportResult {
  job:     ReportJob;
  rows:    Record<string, unknown>[];
  headers: string[];
}

export const reportsApi = {
  listTemplates: () => get<ReportTemplate[]>('/reports/templates'),
  generate:      (dto: { templateKey: string; params: Record<string, unknown> }) =>
    post<ReportResult>('/reports/generate', dto),
  listJobs:      () => get<ReportJob[]>('/reports/jobs'),

  // Analytics
  headcount:    (params?: Record<string, unknown>) => get<{ total: number; byDepartment: Array<{ deptId: string; count: number }> }>('/analytics/headcount', { params }),
  attrition:    (params?: Record<string, unknown>) => get<{ count: number; period: { from: string; to: string } }>('/analytics/attrition', { params }),
  payrollCost:  (params?: Record<string, unknown>) => get<{ employeeCount: number; grossPay: number; netPay: number; deductions: number; month: number; year: number }>('/analytics/payroll-cost', { params }),
};
