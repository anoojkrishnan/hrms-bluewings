export interface Company {
  _id: string;
  publicId: string;
  tenantId: string;
  name: string;
  legalName?: string;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  tan?: string;
  country: string;
  state?: string;
  currency: string;
  timezone: string;
  financialYearStart: 'jan' | 'apr';
  logo?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: CompanyAddress;
  pfEnabled: boolean;
  esiEnabled: boolean;
  ptEnabled: boolean;
  lwfEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

export interface CompanyAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Department {
  _id: string;
  publicId: string;
  tenantId: string;
  organizationId: string;
  companyId: string;
  name: string;
  code?: string;
  parentDepartmentId?: string;
  headEmployeeId?: string;
  costCenterId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

export interface DepartmentTree extends Department {
  children: DepartmentTree[];
}

export interface Designation {
  _id: string;
  publicId: string;
  tenantId: string;
  organizationId: string;
  name: string;
  code?: string;
  gradeId?: string;
  bandId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

export interface Grade {
  _id: string;
  publicId: string;
  tenantId: string;
  organizationId: string;
  name: string;
  code: string;
  level: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

export interface Location {
  _id: string;
  publicId: string;
  tenantId: string;
  organizationId: string;
  name: string;
  code?: string;
  type: 'office' | 'branch' | 'remote' | 'warehouse';
  address?: CompanyAddress;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
}

// DTOs
export interface CreateCompanyDto {
  name: string;
  legalName?: string;
  registrationNumber?: string;
  gstin?: string;
  pan?: string;
  cin?: string;
  tan?: string;
  country?: string;
  state?: string;
  currency?: string;
  timezone?: string;
  financialYearStart?: 'jan' | 'apr';
  phone?: string;
  email?: string;
  website?: string;
  address?: CompanyAddress;
}

export interface UpdateCompanyDto extends Partial<CreateCompanyDto> {}

export interface CreateDepartmentDto {
  name: string;
  code?: string;
  companyId: string;
  parentDepartmentId?: string;
  headEmployeeId?: string;
  costCenterId?: string;
}

export interface UpdateDepartmentDto extends Partial<Omit<CreateDepartmentDto, 'companyId'>> {}

export interface CreateDesignationDto {
  name: string;
  code?: string;
  gradeId?: string;
  bandId?: string;
}

export interface UpdateDesignationDto extends Partial<CreateDesignationDto> {}

export interface CreateGradeDto {
  name: string;
  code: string;
  level: number;
}

export interface UpdateGradeDto extends Partial<CreateGradeDto> {}

export interface CreateLocationDto {
  name: string;
  code?: string;
  type?: 'office' | 'branch' | 'remote' | 'warehouse';
  // Flat fields sent by the frontend form
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  // Or nested address object (for programmatic use)
  addressObj?: CompanyAddress;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  timezone?: string;
}

export interface UpdateLocationDto extends Partial<CreateLocationDto> {}
