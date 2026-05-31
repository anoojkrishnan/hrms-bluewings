import type { BaseDocument } from '@/shared/types/common';

export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  FILE = 'file',
  TEXTAREA = 'textarea',
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}

export interface ConditionalOn {
  fieldKey: string;
  operator: 'eq' | 'neq';
  value: unknown;
}

export interface FormField {
  fieldKey: string;
  label: string;
  type: FieldType;
  required: boolean;
  order: number;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
  conditionalOn?: ConditionalOn;
  visibleToRoles?: string[];
}

export interface DynamicForm extends BaseDocument {
  name: string;
  module: string;
  version: number;
  isActive: boolean;
  fields: FormField[];
}

export interface FormSubmission extends BaseDocument {
  formId: string;
  formVersion: number;
  entityType: string;
  entityPublicId: string;
  submittedBy: string;
  responses: Record<string, unknown>;
}

export interface CreateFormDto {
  name: string;
  module: string;
  fields: FormField[];
}

export interface UpdateFormDto {
  name?: string;
  fields?: FormField[];
  isActive?: boolean;
}

export interface SubmitFormDto {
  entityType: string;
  entityPublicId: string;
  responses: Record<string, unknown>;
}
