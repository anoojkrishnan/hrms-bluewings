import { z } from 'zod';
import { EmployeeStatus, EmploymentType } from './employee.types';

export const createEmployeeSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    workEmail: z.string().email().optional(),
    status: z.nativeEnum(EmployeeStatus).optional(),
    joiningDate: z.string().datetime(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    gradeId: z.string().optional(),
    locationId: z.string().optional(),
    reportingManagerId: z.string().optional(),
    employmentType: z.nativeEnum(EmploymentType),
    probationEndDate: z.string().datetime().optional(),
    noticePeriodDays: z.number().int().min(0).optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  body: z.object({
    companyId: z.string().optional(),
    workEmail: z.string().email().optional(),
    joiningDate: z.string().datetime().optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    gradeId: z.string().optional(),
    locationId: z.string().optional(),
    costCenterId: z.string().optional(),
    businessUnitId: z.string().optional(),
    reportingManagerId: z.string().optional(),
    employmentType: z.nativeEnum(EmploymentType).optional(),
    probationEndDate: z.string().datetime().optional(),
    noticePeriodDays: z.number().int().min(0).optional(),
  }),
});

export const changeStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(EmployeeStatus),
    reason: z.string().optional(),
  }),
});

export const updatePersonalDetailsSchema = z.object({
  body: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    middleName: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.string().optional(),
    maritalStatus: z.string().optional(),
    nationality: z.string().optional(),
    bloodGroup: z.string().optional(),
    panNumber: z.string().optional(),
    aadhaarNumber: z.string().optional(),
  }),
});

export const upsertBankDetailsSchema = z.object({
  body: z.object({
    accountNumber: z.string().min(1),
    ifscCode: z.string().min(1),
    bankName: z.string().min(1),
    branchName: z.string().optional(),
    accountType: z.enum(['savings', 'current']),
    isPrimary: z.boolean().optional(),
  }),
});

export const confirmDocumentSchema = z.object({
  body: z.object({
    documentType: z.string().min(1),
    documentName: z.string().min(1),
    s3Key: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    checksum: z.string().min(1),
    expiryDate: z.string().datetime().optional(),
  }),
});

export const presignDocumentSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
  }),
});
