import type { WorkOrder } from './workorder';

export interface Money {
  amountCents: number;
  currency: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface DashboardStats {
  recentWorkOrders: WorkOrder[];
  activeWorkOrderCount: number;
  lowStockCount: number;
  pendingInvoiceCount: number;
}
