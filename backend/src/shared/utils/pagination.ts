import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '@/config/constants';
import type { PaginationMeta, PaginationQuery } from '@/shared/types/common';

export interface PaginationOptions {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, 1 | -1>;
}

export const buildPaginationOptions = (query: PaginationQuery): PaginationOptions => {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;
  const sortField = query.sortBy ?? 'createdAt';
  const sortDir: 1 | -1 = query.sortOrder === 'asc' ? 1 : -1;

  return { page, limit, skip, sort: { [sortField]: sortDir } };
};

export const buildPaginationMeta = (page: number, limit: number, total: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});
