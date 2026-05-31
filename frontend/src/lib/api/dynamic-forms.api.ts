import { get, getList, post, put, del } from './client';

export interface DynamicForm {
  publicId: string;
  name: string;
  module: string;
  version: number;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
}

export interface FormField {
  publicId: string;
  label: string;
  fieldType: 'text' | 'number' | 'date' | 'dropdown' | 'checkbox' | 'radio' | 'file' | 'textarea';
  isRequired: boolean;
  order: number;
  options?: string[];
  placeholder?: string;
}

export interface FormSubmission {
  publicId: string;
  formPublicId: string;
  entityType: string;
  entityPublicId: string;
  responses: Record<string, unknown>;
  submittedBy: string;
  createdAt: string;
}

export const dynamicFormsApi = {
  listForms: (params?: { page?: number; limit?: number }) =>
    getList<DynamicForm>('/forms', { params }),

  createForm: (data: { name: string; module: string }) =>
    post<DynamicForm>('/forms', data),

  getForm: (publicId: string) =>
    get<DynamicForm>(`/forms/${publicId}`),

  updateForm: (publicId: string, data: Partial<DynamicForm>) =>
    put<DynamicForm>(`/forms/${publicId}`, data),

  deleteForm: (publicId: string) =>
    del<void>(`/forms/${publicId}`),

  listSubmissions: (formPublicId: string, params?: { page?: number; limit?: number }) =>
    getList<FormSubmission>(`/forms/${formPublicId}/submissions`, { params }),

  submitForm: (
    formPublicId: string,
    data: { entityType: string; entityPublicId: string; responses: Record<string, unknown> },
  ) => post<FormSubmission>(`/forms/${formPublicId}/submissions`, data),

  getSubmission: (formPublicId: string, submissionPublicId: string) =>
    get<FormSubmission>(`/forms/${formPublicId}/submissions/${submissionPublicId}`),
};
