export enum ClaimStatus {
  DRAFT     = 'draft',
  SUBMITTED = 'submitted',
  APPROVED  = 'approved',
  REJECTED  = 'rejected',
  PAID      = 'paid',
}

export interface ExpenseCategory {
  _id?: unknown;
  publicId: string;
  tenantId: string;
  organizationId?: string;
  name: string;
  code: string;
  maxAmountPerClaim?: number;
  requiresReceipt: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ClaimItem {
  categoryId: string;
  description: string;
  amount: number;
  date: Date;
  receiptS3Key?: string;
}

export interface ExpenseClaim {
  _id?: unknown;
  publicId: string;
  tenantId: string;
  organizationId?: string;
  employeeId: string;
  companyId?: string;
  title: string;
  items: ClaimItem[];
  totalAmount: number;
  status: ClaimStatus;
  submittedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  notes?: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

// DTOs
export interface CreateCategoryDto {
  name: string;
  code: string;
  maxAmountPerClaim?: number;
  requiresReceipt?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  maxAmountPerClaim?: number;
  requiresReceipt?: boolean;
  isActive?: boolean;
}

export interface CreateClaimDto {
  title: string;
  items: Array<{
    categoryId: string;
    description: string;
    amount: number;
    date: string;
  }>;
  notes?: string;
}

export interface ReviewClaimDto {
  rejectionReason?: string;
}
