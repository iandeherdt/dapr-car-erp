import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Part, CreatePartInput, PaginatedResponse } from '@car-erp/shared-types';
import { apiFetch } from '@/lib/api';

export function useParts(
  page: number,
  pageSize: number,
  category?: string,
  search?: string,
) {
  return useQuery({
    queryKey: ['parts', page, pageSize, category, search],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      return apiFetch<{ parts: Part[]; pagination: PaginatedResponse<Part>['pagination'] }>(`/api/parts?${params.toString()}`);
    },
    select: (raw) => ({ data: raw.parts, pagination: raw.pagination } as PaginatedResponse<Part>),
  });
}

export function usePart(id: string) {
  return useQuery<Part>({
    queryKey: ['parts', id],
    queryFn: () => apiFetch<Part>(`/api/parts/${id}`),
    enabled: !!id,
  });
}

export function useCreatePart() {
  const queryClient = useQueryClient();
  return useMutation<Part, Error, CreatePartInput>({
    mutationFn: (input) =>
      apiFetch<Part>('/api/parts', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
    },
  });
}

export function useUpdatePart() {
  const queryClient = useQueryClient();
  return useMutation<Part, Error, { id: string; data: Partial<CreatePartInput> }>({
    mutationFn: ({ id, data }) =>
      apiFetch<Part>(`/api/parts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['parts'] });
      queryClient.invalidateQueries({ queryKey: ['parts', id] });
    },
  });
}

export function useLowStockParts(page: number, pageSize: number) {
  return useQuery({
    queryKey: ['parts', 'low-stock', page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      return apiFetch<{ parts: Part[]; pagination: PaginatedResponse<Part>['pagination'] }>(`/api/parts/low-stock?${params.toString()}`);
    },
    select: (raw) => ({ data: raw.parts, pagination: raw.pagination } as PaginatedResponse<Part>),
  });
}
