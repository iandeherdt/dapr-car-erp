import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Invoice, InvoiceStatus, PaginatedResponse } from '@car-erp/shared-types';
import { apiFetch } from '@/lib/api';

export function useInvoices(page: number, pageSize: number, status?: InvoiceStatus) {
  return useQuery({
    queryKey: ['invoices', page, pageSize, status],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (status) params.set('status', status);
      return apiFetch<{ invoices: Invoice[]; pagination: PaginatedResponse<Invoice>['pagination'] }>(`/api/invoices?${params.toString()}`);
    },
    select: (raw) => ({ data: raw.invoices, pagination: raw.pagination } as PaginatedResponse<Invoice>),
  });
}

export function useInvoice(id: string) {
  return useQuery<Invoice>({
    queryKey: ['invoices', id],
    queryFn: () => apiFetch<Invoice>(`/api/invoices/${id}`),
    enabled: !!id,
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();
  return useMutation<Invoice, Error, { id: string; status: InvoiceStatus }>({
    mutationFn: ({ id, status }) =>
      apiFetch<Invoice>(`/api/invoices/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices', id] });
    },
  });
}

export function useCustomerInvoices(customerId: string, page: number, pageSize: number) {
  return useQuery({
    queryKey: ['invoices', 'customer', customerId, page, pageSize],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      return apiFetch<{ invoices: Invoice[]; pagination: PaginatedResponse<Invoice>['pagination'] }>(
        `/api/customers/${customerId}/invoices?${params.toString()}`
      );
    },
    select: (raw) => ({ data: raw.invoices, pagination: raw.pagination } as PaginatedResponse<Invoice>),
    enabled: !!customerId,
  });
}
