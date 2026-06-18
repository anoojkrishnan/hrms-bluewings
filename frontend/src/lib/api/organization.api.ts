import { get, getList, post, put, del } from './client';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface CompanyAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Company {
  publicId: string;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  pfNumber?: string;
  esiNumber?: string;
  linNumber?: string;
  country: string;
  state?: string;
  currency: string;
  timezone: string;
  financialYearStart?: 'jan' | 'apr';
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: CompanyAddress;
  pfEnabled: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
  lwfEnabled: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface Department {
  publicId: string;
  name: string;
  code: string;
  companyId: string;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Designation {
  publicId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface Grade {
  publicId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
}

export interface Location {
  publicId: string;
  name: string;
  code: string;
  type?: string;
  // Backend stores address nested; these are convenience flat accessors populated from address object
  address?: { line1?: string; city?: string; state?: string; pincode?: string; country?: string };
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  isActive: boolean;
  createdAt: string;
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  cin?: string;
  gstin?: string;
  pan?: string;
  tan?: string;
  pfNumber?: string;
  esiNumber?: string;
  linNumber?: string;
  country?: string;
  state?: string;
  currency?: string;
  timezone?: string;
  financialYearStart?: 'jan' | 'apr';
  phone?: string;
  email?: string;
  website?: string;
  address?: CompanyAddress;
  pfEnabled?: boolean;
  esiEnabled?: boolean;
  ptEnabled?: boolean;
  lwfEnabled?: boolean;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

export interface LogoPresignResult {
  uploadUrl: string;
  s3Key: string;
  expiresAt: string;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  companyId: string;
  parentId?: string;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {}

export interface CreateDesignationDto {
  name: string;
  code: string;
}

export interface UpdateDesignationDto extends Partial<CreateDesignationDto> {}

export interface CreateGradeDto {
  name: string;
  code: string;
}

export interface UpdateGradeDto extends Partial<CreateGradeDto> {}

export interface CreateLocationDto {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {}

export interface AuthoritySignature {
  publicId: string;
  employeePublicId: string;
  employeeName: string;
  employeeCode: string;
  designationName?: string;
  signatureUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAuthoritySignatureDto {
  employeePublicId: string;
  employeeName: string;
  employeeCode: string;
  designationId?: string;
}

export interface UpdateAuthoritySignatureDto {
  employeeName?: string;
  employeeCode?: string;
}

// ── API client ────────────────────────────────────────────────────────────────

export const organizationApi = {
  // Companies
  listCompanies: (params?: Record<string, string>) =>
    getList<Company>('/companies', { params }),

  getCompany: (publicId: string) =>
    get<Company>(`/companies/${publicId}`),

  createCompany: (dto: CreateCompanyDto) =>
    post<Company>('/companies', dto),

  updateCompany: (publicId: string, dto: UpdateCompanyDto) =>
    put<Company>(`/companies/${publicId}`, dto),

  deleteCompany: (publicId: string) =>
    del<void>(`/companies/${publicId}`),

  uploadLogo: async (publicId: string, file: File): Promise<Company> => {
    const { getApiClient } = await import('./client');
    const client = getApiClient();
    const buffer = await file.arrayBuffer();
    const res = await client.post<{ success: boolean; data: Company }>(
      `/companies/${publicId}/logo`,
      buffer,
      { headers: { 'Content-Type': file.type || 'image/png' } },
    );
    return res.data.data;
  },

  presignLogoUpload: (publicId: string, mimeType: string) =>
    post<LogoPresignResult>(`/companies/${publicId}/logo/presign`, { mimeType }),

  confirmLogoUpload: (publicId: string, s3Key: string) =>
    post<Company>(`/companies/${publicId}/logo/confirm`, { s3Key }),

  deleteCompanyLogo: (publicId: string) =>
    del<void>(`/companies/${publicId}/logo`),

  // Departments
  listDepartments: (params?: Record<string, string>) =>
    getList<Department>('/departments', { params }),

  getDepartmentTree: () =>
    get<Department[]>('/departments/tree'),

  getDepartment: (publicId: string) =>
    get<Department>(`/departments/${publicId}`),

  createDepartment: (dto: CreateDepartmentDto) =>
    post<Department>('/departments', dto),

  updateDepartment: (publicId: string, dto: UpdateDepartmentDto) =>
    put<Department>(`/departments/${publicId}`, dto),

  deleteDepartment: (publicId: string) =>
    del<void>(`/departments/${publicId}`),

  // Designations
  listDesignations: (params?: Record<string, string>) =>
    getList<Designation>('/designations', { params }),

  getDesignation: (publicId: string) =>
    get<Designation>(`/designations/${publicId}`),

  createDesignation: (dto: CreateDesignationDto) =>
    post<Designation>('/designations', dto),

  updateDesignation: (publicId: string, dto: UpdateDesignationDto) =>
    put<Designation>(`/designations/${publicId}`, dto),

  deleteDesignation: (publicId: string) =>
    del<void>(`/designations/${publicId}`),

  // Grades
  listGrades: (params?: Record<string, string>) =>
    getList<Grade>('/grades', { params }),

  getGrade: (publicId: string) =>
    get<Grade>(`/grades/${publicId}`),

  createGrade: (dto: CreateGradeDto) =>
    post<Grade>('/grades', dto),

  updateGrade: (publicId: string, dto: UpdateGradeDto) =>
    put<Grade>(`/grades/${publicId}`, dto),

  deleteGrade: (publicId: string) =>
    del<void>(`/grades/${publicId}`),

  // Locations
  listLocations: (params?: Record<string, string>) =>
    getList<Location>('/locations', { params }),

  getLocation: (publicId: string) =>
    get<Location>(`/locations/${publicId}`),

  createLocation: (dto: CreateLocationDto) =>
    post<Location>('/locations', dto),

  updateLocation: (publicId: string, dto: UpdateLocationDto) =>
    put<Location>(`/locations/${publicId}`, dto),

  deleteLocation: (publicId: string) =>
    del<void>(`/locations/${publicId}`),

  // Authority Signatures
  listAuthoritySignatures: (params?: Record<string, string>) =>
    getList<AuthoritySignature>('/authority-signatures', { params }),

  getAuthoritySignature: (publicId: string) =>
    get<AuthoritySignature>(`/authority-signatures/${publicId}`),

  createAuthoritySignature: (dto: CreateAuthoritySignatureDto) =>
    post<AuthoritySignature>('/authority-signatures', dto),

  updateAuthoritySignature: (publicId: string, dto: UpdateAuthoritySignatureDto) =>
    put<AuthoritySignature>(`/authority-signatures/${publicId}`, dto),

  deleteAuthoritySignature: (publicId: string) =>
    del<void>(`/authority-signatures/${publicId}`),

  uploadAuthoritySignatureImage: async (publicId: string, file: File): Promise<AuthoritySignature> => {
    const { getApiClient } = await import('./client');
    const client = getApiClient();
    const buffer = await file.arrayBuffer();
    const res = await client.post<{ success: boolean; data: AuthoritySignature }>(
      `/authority-signatures/${publicId}/image`,
      buffer,
      { headers: { 'Content-Type': file.type || 'image/png' } },
    );
    return res.data.data;
  },

  deleteAuthoritySignatureImage: (publicId: string) =>
    del<AuthoritySignature>(`/authority-signatures/${publicId}/image`),
};
