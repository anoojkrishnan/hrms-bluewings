import { get, getList, post, put, patch, del } from './client';

export const DOCUMENT_TYPES = [
  { value: 'general',            label: 'General' },
  { value: 'id_proof',           label: 'ID Proof' },
  { value: 'offer_letter',       label: 'Offer Letter' },
  { value: 'appointment_letter', label: 'Appointment Letter' },
  { value: 'educational',        label: 'Educational Certificate' },
  { value: 'experience',         label: 'Experience Certificate' },
  { value: 'pan_card',           label: 'PAN Card' },
  { value: 'aadhaar_card',       label: 'Aadhaar Card' },
  { value: 'passport',           label: 'Passport' },
  { value: 'driving_license',    label: 'Driving License' },
  { value: 'bank_statement',     label: 'Bank Statement' },
  { value: 'salary_slip',        label: 'Salary Slip' },
  { value: 'photo',              label: 'Photo' },
  { value: 'other',              label: 'Other' },
] as const;

export interface Employee {
  publicId: string;
  employeeCode: string;
  companyId: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  userId?: string;
  status: string;
  joiningDate: string;
  lastWorkingDate?: string;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  reportingManagerId?: string;
  employmentType: string;
  probationEndDate?: string;
  noticePeriodDays: number;
  essEnabled: boolean;
  essInvitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePersonalDetails {
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  panNumber?: string;
  aadhaarNumber?: string;
}

export interface EmployeeBankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'savings' | 'current';
  isPrimary: boolean;
}

export interface EmployeeDocument {
  publicId: string;
  documentType: string;
  documentName: string;
  mimeType: string;
  sizeBytes: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  expiryDate?: string;
  version: number;
  uploadedBy: string;
  createdAt: string;
}

export interface EmployeeStatusHistory {
  fromStatus: string;
  toStatus: string;
  changedAt: string;
  changedBy: string;
  reason?: string;
}

export interface CreateEmployeeDto {
  firstName?: string;
  lastName?: string;
  companyId: string;
  workEmail?: string;
  joiningDate: string;
  employmentType: string;
  status?: string;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  reportingManagerId?: string;
  probationEndDate?: string;
  noticePeriodDays?: number;
}

export interface UpdateEmployeeDto {
  companyId?: string;
  workEmail?: string;
  joiningDate?: string;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  reportingManagerId?: string;
  employmentType?: string;
  probationEndDate?: string;
  noticePeriodDays?: number;
}

export interface ChangeStatusDto {
  status: string;
  reason?: string;
  lastWorkingDate?: string;
}

export const employeeApi = {
  list: (params?: Record<string, string>) =>
    getList<Employee>('/employees', { params }),

  get: (employeeCode: string) =>
    get<Employee>(`/employees/${employeeCode}`),

  create: (dto: CreateEmployeeDto) =>
    post<Employee>('/employees', dto),

  update: (employeeCode: string, dto: UpdateEmployeeDto) =>
    put<Employee>(`/employees/${employeeCode}`, dto),

  changeStatus: (employeeCode: string, dto: ChangeStatusDto) =>
    patch<Employee>(`/employees/${employeeCode}/status`, dto),

  remove: (employeeCode: string) =>
    del<void>(`/employees/${employeeCode}`),

  // Personal details
  getPersonal: (employeeCode: string) =>
    get<EmployeePersonalDetails | null>(`/employees/${employeeCode}/personal`),

  updatePersonal: (employeeCode: string, dto: Partial<EmployeePersonalDetails>) =>
    put<void>(`/employees/${employeeCode}/personal`, dto),

  // Bank details
  getBankDetails: (employeeCode: string) =>
    get<EmployeeBankDetails[]>(`/employees/${employeeCode}/bank-details`),

  upsertBankDetails: (employeeCode: string, dto: EmployeeBankDetails) =>
    put<void>(`/employees/${employeeCode}/bank-details`, dto),

  // Documents
  getDocuments: (employeeCode: string) =>
    get<EmployeeDocument[]>(`/employees/${employeeCode}/documents`),

  uploadDocument: async (
    employeeCode: string,
    file: File,
    documentName?: string,
    documentType?: string,
    expiryDate?: string,
  ): Promise<EmployeeDocument> => {
    const { getApiClient } = await import('./client');
    const client = getApiClient();
    const buffer = await file.arrayBuffer();
    const res = await client.post<{ success: boolean; data: EmployeeDocument }>(
      `/employees/${employeeCode}/documents`,
      buffer,
      {
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
          'X-File-Size': String(file.size),
          ...(documentType && { 'X-Document-Type': documentType }),
          ...(documentName && { 'X-Document-Name': encodeURIComponent(documentName) }),
          ...(expiryDate && { 'X-Expiry-Date': expiryDate }),
        },
      },
    );
    return res.data.data;
  },

  updateDocument: (
    employeeCode: string,
    docPublicId: string,
    dto: { documentName?: string; documentType?: string; expiryDate?: string | null; verificationStatus?: string },
  ) => patch<EmployeeDocument>(`/employees/${employeeCode}/documents/${docPublicId}`, dto),

  getDocumentDownloadUrl: (employeeCode: string, docPublicId: string) =>
    get<{ url: string }>(`/employees/${employeeCode}/documents/${docPublicId}/download`),

  deleteDocument: (employeeCode: string, docPublicId: string) =>
    del<void>(`/employees/${employeeCode}/documents/${docPublicId}`),

  // Timeline
  getTimeline: (employeeCode: string) =>
    get<EmployeeStatusHistory[]>(`/employees/${employeeCode}/timeline`),

  // ESS
  inviteEss: (employeeCode: string) =>
    post<Employee>(`/employees/${employeeCode}/ess/invite`),

  disableEss: (employeeCode: string) =>
    post<Employee>(`/employees/${employeeCode}/ess/disable`),
};
