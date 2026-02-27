import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WorkOrder,
  WorkOrderStatus,
  PaginatedResponse,
  CreateWorkOrderInput,
} from '@car-erp/shared-types';
import { apiFetch } from '@/lib/api';

// ---- Aggregated work order response (includes customer & vehicle details) ----

export interface AggregatedWorkOrder extends WorkOrder {
  customer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    companyName: string;
  };
  vehicle?: {
    id: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    vin: string;
    mileageKm: number;
    engineType: string;
    color: string;
  };
}

// ---- Query Keys ----

const workOrderKeys = {
  all: ['workorders'] as const,
  list: (
    page: number,
    pageSize: number,
    status: string,
    customerId: string,
  ) => ['workorders', 'list', page, pageSize, status, customerId] as const,
  detail: (id: string) => ['workorders', 'detail', id] as const,
};

// ---- Hooks ----

export function useWorkOrders(
  page = 1,
  pageSize = 20,
  status = '',
  customerId = '',
) {
  return useQuery({
    queryKey: workOrderKeys.list(page, pageSize, status, customerId),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(status ? { status } : {}),
        ...(customerId ? { customerId } : {}),
      });
      return apiFetch<{ workOrders: WorkOrder[]; pagination: PaginatedResponse<WorkOrder>['pagination'] }>(
        `/api/work-orders?${params}`,
      );
    },
    select: (raw) => ({ data: raw.workOrders, pagination: raw.pagination } as PaginatedResponse<WorkOrder>),
  });
}

export function useWorkOrder(id: string) {
  return useQuery({
    queryKey: workOrderKeys.detail(id),
    queryFn: () =>
      apiFetch<AggregatedWorkOrder>(`/api/work-orders/${id}/aggregated`),
    enabled: Boolean(id),
  });
}

export function useCreateWorkOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkOrderInput) =>
      apiFetch<WorkOrder>('/api/work-orders', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
    },
  });
}

export function useUpdateWorkOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: WorkOrderStatus;
    }) =>
      apiFetch<WorkOrder>(`/api/work-orders/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workOrderKeys.all });
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.id),
      });
    },
  });
}

export function useAddLineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      partId,
      quantity,
    }: {
      workOrderId: string;
      partId: string;
      quantity: number;
    }) =>
      apiFetch(`/api/work-orders/${workOrderId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({ partId, quantity }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

export function useRemoveLineItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      lineItemId,
    }: {
      workOrderId: string;
      lineItemId: string;
    }) =>
      apiFetch(`/api/work-orders/${workOrderId}/line-items/${lineItemId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}

export function useAddLaborEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workOrderId,
      description,
      technicianName,
      hoursWorked,
      hourlyRateCents,
      currency,
    }: {
      workOrderId: string;
      description: string;
      technicianName: string;
      hoursWorked: number;
      hourlyRateCents: number;
      currency: string;
    }) =>
      apiFetch(`/api/work-orders/${workOrderId}/labor`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          technicianName,
          hoursWorked,
          hourlyRate: { amountCents: hourlyRateCents, currency },
        }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: workOrderKeys.detail(variables.workOrderId),
      });
    },
  });
}
