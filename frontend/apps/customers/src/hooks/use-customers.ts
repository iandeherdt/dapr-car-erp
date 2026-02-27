import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Customer,
  PaginatedResponse,
  CreateCustomerInput,
  UpdateCustomerInput,
  AddVehicleInput,
  Vehicle,
} from '@car-erp/shared-types';
import { apiFetch } from '@/lib/api';

// ---- Query Keys ----

const customerKeys = {
  all: ['customers'] as const,
  list: (page: number, pageSize: number, search: string) =>
    ['customers', 'list', page, pageSize, search] as const,
  detail: (id: string) => ['customers', 'detail', id] as const,
};

// ---- Hooks ----

export function useCustomers(page = 1, pageSize = 20, search = '') {
  return useQuery({
    queryKey: customerKeys.list(page, pageSize, search),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(search ? { search } : {}),
      });
      return apiFetch<{ customers: Customer[]; pagination: PaginatedResponse<Customer>['pagination'] }>(`/api/customers?${params}`);
    },
    select: (raw) => ({ data: raw.customers, pagination: raw.pagination } as PaginatedResponse<Customer>),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => apiFetch<Customer>(`/api/customers/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCustomerInput) =>
      apiFetch<Customer>('/api/customers', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCustomerInput) =>
      apiFetch<Customer>(`/api/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.id),
      });
    },
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/customers/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

export function useAddVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ customerId, ...input }: AddVehicleInput) =>
      apiFetch<Vehicle>(`/api/customers/${customerId}/vehicles`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      customerId,
      vehicleId,
      ...input
    }: Partial<AddVehicleInput> & { customerId: string; vehicleId: string }) =>
      apiFetch<Vehicle>(`/api/customers/${customerId}/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(variables.customerId),
      });
    },
  });
}
