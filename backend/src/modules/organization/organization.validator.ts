import { z } from 'zod';

const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(1),
  country: z.string().default('IN'),
}).optional();

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Company name required'),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    cin: z.string().optional(),
    tan: z.string().optional(),
    country: z.string().default('IN'),
    state: z.string().optional(),
    currency: z.string().default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
    financialYearStart: z.enum(['jan', 'apr']).default('apr'),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    address: addressSchema,
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    gstin: z.string().optional(),
    pan: z.string().optional(),
    cin: z.string().optional(),
    tan: z.string().optional(),
    state: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional(),
    address: addressSchema,
    pfEnabled: z.boolean().optional(),
    esiEnabled: z.boolean().optional(),
    ptEnabled: z.boolean().optional(),
    lwfEnabled: z.boolean().optional(),
  }),
});

export const publicIdParamSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
});

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Department name required'),
    code: z.string().optional(),
    companyId: z.string().min(1, 'Company ID required'),
    parentDepartmentId: z.string().optional(),
    headEmployeeId: z.string().optional(),
    costCenterId: z.string().optional(),
  }),
});

export const updateDepartmentSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    parentDepartmentId: z.string().optional(),
    headEmployeeId: z.string().optional(),
    costCenterId: z.string().optional(),
  }),
});

export const createDesignationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Designation name required'),
    code: z.string().optional(),
    gradeId: z.string().optional(),
    bandId: z.string().optional(),
  }),
});

export const updateDesignationSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    gradeId: z.string().optional(),
    bandId: z.string().optional(),
  }),
});

export const createGradeSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Grade name required'),
    code: z.string().min(1, 'Grade code required'),
    level: z.number().int().min(1),
  }),
});

export const updateGradeSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    level: z.number().int().min(1).optional(),
  }),
});

export const createLocationSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Location name required'),
    code: z.string().optional(),
    type: z.enum(['office', 'branch', 'remote', 'warehouse']),
    address: addressSchema,
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    geofenceRadius: z.number().positive().optional(),
    timezone: z.string().default('Asia/Kolkata'),
  }),
});

export const updateLocationSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(1).optional(),
    code: z.string().optional(),
    type: z.enum(['office', 'branch', 'remote', 'warehouse']).optional(),
    address: addressSchema,
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    geofenceRadius: z.number().positive().optional(),
    timezone: z.string().optional(),
  }),
});
