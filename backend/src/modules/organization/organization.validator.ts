import { z } from 'zod';

const addressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits'),
  country: z.string().default('IN'),
}).optional();

// India-specific statutory number formats
const gstinSchema = z.string()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format (e.g. 27AAAAA0000A1Z5)')
  .optional()
  .or(z.literal(''));

const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. AAAPL1234C)')
  .optional()
  .or(z.literal(''));

const tanSchema = z.string()
  .regex(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/, 'Invalid TAN format (e.g. PDES03028F)')
  .optional()
  .or(z.literal(''));

const cinSchema = z.string()
  .regex(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/, 'Invalid CIN format (e.g. L17110MH1973PLC019786)')
  .optional()
  .or(z.literal(''));

const pfNumberSchema = z.string()
  .regex(/^[A-Z]{2}[A-Z]{3}[0-9]{7}[0-9]{3}[0-9]{7}$|^[A-Z]{2}\/[A-Z]{3}\/[0-9]{7}\/[0-9]{3}\/[0-9]{7}$/, 'Invalid PF number format (e.g. MH/BAN/0010704/000/0014141)')
  .optional()
  .or(z.literal(''));

const esiNumberSchema = z.string()
  .regex(/^[0-9]{17}$/, 'ESI number must be 17 digits')
  .optional()
  .or(z.literal(''));

const linNumberSchema = z.string()
  .regex(/^[A-Z0-9]{14}$/, 'LIN must be 14 alphanumeric characters')
  .optional()
  .or(z.literal(''));

export const createCompanySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    cin: cinSchema,
    gstin: gstinSchema,
    pan: panSchema,
    tan: tanSchema,
    pfNumber: pfNumberSchema,
    esiNumber: esiNumberSchema,
    linNumber: linNumberSchema,
    country: z.string().default('IN'),
    state: z.string().optional(),
    currency: z.string().default('INR'),
    timezone: z.string().default('Asia/Kolkata'),
    financialYearStart: z.enum(['jan', 'apr']).default('apr'),
    phone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    address: addressSchema,
    pfEnabled: z.boolean().optional(),
    esiEnabled: z.boolean().optional(),
    ptEnabled: z.boolean().optional(),
    lwfEnabled: z.boolean().optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name: z.string().min(2).optional(),
    legalName: z.string().optional(),
    registrationNumber: z.string().optional(),
    cin: cinSchema,
    gstin: gstinSchema,
    pan: panSchema,
    tan: tanSchema,
    pfNumber: pfNumberSchema,
    esiNumber: esiNumberSchema,
    linNumber: linNumberSchema,
    country: z.string().optional(),
    state: z.string().optional(),
    currency: z.string().optional(),
    timezone: z.string().optional(),
    financialYearStart: z.enum(['jan', 'apr']).optional(),
    phone: z.string().regex(/^\+?[0-9\s\-()]{7,15}$/, 'Invalid phone number').optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    address: addressSchema,
    pfEnabled: z.boolean().optional(),
    esiEnabled: z.boolean().optional(),
    ptEnabled: z.boolean().optional(),
    lwfEnabled: z.boolean().optional(),
  }),
});

export const logoPresignSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    mimeType: z.string().regex(/^image\/(jpeg|png|webp|svg\+xml)$/, 'Only JPEG, PNG, WebP, or SVG images are allowed'),
  }),
});

export const logoConfirmSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    s3Key: z.string().min(1),
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

// Flat address fields sent by the frontend (address line, city, state, country, pincode)
const flatAddressFields = {
  address:  z.string().optional(),
  city:     z.string().optional(),
  state:    z.string().optional(),
  country:  z.string().optional(),
  pincode:  z.string().optional(),
};

export const createLocationSchema = z.object({
  body: z.object({
    name:           z.string().min(1, 'Location name required'),
    code:           z.string().optional(),
    type:           z.enum(['office', 'branch', 'remote', 'warehouse']).optional().default('office'),
    ...flatAddressFields,
    latitude:       z.number().optional(),
    longitude:      z.number().optional(),
    geofenceRadius: z.number().positive().optional(),
    timezone:       z.string().default('Asia/Kolkata'),
  }),
});

export const updateLocationSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    name:           z.string().min(1).optional(),
    code:           z.string().optional(),
    type:           z.enum(['office', 'branch', 'remote', 'warehouse']).optional(),
    ...flatAddressFields,
    latitude:       z.number().optional(),
    longitude:      z.number().optional(),
    geofenceRadius: z.number().positive().optional(),
    timezone:       z.string().optional(),
  }),
});
