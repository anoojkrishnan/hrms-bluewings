import { useState, useCallback } from 'react';
import type { PaginationMeta } from '@/types/api.types';

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination(meta: PaginationMeta | undefined, options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [limit, setLimit] = useState(options.initialLimit ?? 20);

  const goToPage = useCallback((p: number) => setPage(p), []);
  const nextPage = useCallback(() => setPage((prev) => prev + 1), []);
  const prevPage = useCallback(() => setPage((prev) => Math.max(1, prev - 1)), []);

  return {
    page,
    limit,
    setLimit,
    goToPage,
    nextPage,
    prevPage,
    hasNext: meta?.hasNext ?? false,
    hasPrev: meta?.hasPrev ?? false,
    totalPages: meta?.totalPages ?? 1,
    total: meta?.total ?? 0,
  };
}
