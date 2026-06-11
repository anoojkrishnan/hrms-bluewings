import { get, getList, post, put, patch } from './client';

export interface ExpenseCategory {
  publicId: string;
  name: string;
  code: string;
  maxAmountPerClaim?: number;
  requiresReceipt: boolean;
  isActive: boolean;
}

export interface ClaimItem {
  categoryId: string;
  description: string;
  amount: number;
  date: string;
}

export interface ExpenseClaim {
  publicId: string;
  employeeId: string;
  title: string;
  items: ClaimItem[];
  totalAmount: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
}

export const expenseApi = {
  // Categories
  listCategories: () => get<ExpenseCategory[]>('/expense/categories'),
  createCategory: (dto: { name: string; code: string; maxAmountPerClaim?: number; requiresReceipt?: boolean }) =>
    post<ExpenseCategory>('/expense/categories', dto),
  updateCategory: (publicId: string, dto: Partial<ExpenseCategory>) =>
    put<ExpenseCategory>(`/expense/categories/${publicId}`, dto),

  // Claims
  listClaims: (params?: Record<string, unknown>) => getList<ExpenseClaim>('/expense/claims', { params }),
  getClaim:   (publicId: string) => get<ExpenseClaim>(`/expense/claims/${publicId}`),
  createClaim: (dto: { title: string; items: ClaimItem[]; notes?: string }) =>
    post<ExpenseClaim>('/expense/claims', dto),
  submitClaim:  (publicId: string) => post<ExpenseClaim>(`/expense/claims/${publicId}/submit`),
  approveClaim: (publicId: string) => patch<ExpenseClaim>(`/expense/claims/${publicId}/approve`),
  rejectClaim:  (publicId: string, rejectionReason: string) =>
    patch<ExpenseClaim>(`/expense/claims/${publicId}/reject`, { rejectionReason }),
};
