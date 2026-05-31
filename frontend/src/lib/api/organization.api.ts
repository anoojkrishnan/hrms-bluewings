import { get, getList, post, put, del } from './client';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface Company {
  publicId: string;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  pf?: string;
  esi?: string;
  pt?: string;
  country: string;
  state?: string;
  currency: string;
  timezone: string;
  logo?: string;
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
  address?: string;
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
  gstin?: string;
  pan?: string;
  country?: string;
  state?: string;
  currency?: string;
  timezone?: string;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

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
};
