import { createServiceClient } from './grpc-client.js';

const PROTO_PATH = 'workorder/v1/workorder.proto';
const PACKAGE_NAME = 'workorder.v1';
const SERVICE_NAME = 'WorkOrderService';
const DAPR_APP_ID = 'workorder-service';

function getClient() {
  return createServiceClient(PROTO_PATH, PACKAGE_NAME, SERVICE_NAME, DAPR_APP_ID);
}

// ---- Type definitions ----

export interface Money {
  amountCents: string;
  currency: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type WorkOrderStatus =
  | 'WORK_ORDER_STATUS_UNSPECIFIED'
  | 'WORK_ORDER_STATUS_DRAFT'
  | 'WORK_ORDER_STATUS_PENDING'
  | 'WORK_ORDER_STATUS_IN_PROGRESS'
  | 'WORK_ORDER_STATUS_AWAITING_PARTS'
  | 'WORK_ORDER_STATUS_COMPLETED'
  | 'WORK_ORDER_STATUS_CANCELLED'
  | 'WORK_ORDER_STATUS_INVOICED';

export interface WorkOrderLineItem {
  id: string;
  workOrderId: string;
  partId: string;
  partName: string;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}

export interface LaborEntry {
  id: string;
  workOrderId: string;
  description: string;
  hours: number;
  hourlyRate: Money;
  total: Money;
  mechanicName: string;
}

export interface WorkOrder {
  id: string;
  customerId: string;
  vehicleId: string;
  description: string;
  status: WorkOrderStatus;
  lineItems: WorkOrderLineItem[];
  laborEntries: LaborEntry[];
  estimatedTotal: Money;
  actualTotal: Money;
  assignedMechanic: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string;
}

export interface ListWorkOrdersResponse {
  workOrders: WorkOrder[];
  pagination: PaginationResult;
}

// ---- Request shapes ----

export interface CreateWorkOrderRequest {
  customerId: string;
  vehicleId: string;
  description: string;
  assignedMechanic?: string;
  notes?: string;
}

export interface UpdateWorkOrderStatusRequest {
  id: string;
  newStatus: WorkOrderStatus;
}

export interface AddLineItemRequest {
  workOrderId: string;
  partId: string;
  quantity: number;
}

export interface RemoveLineItemRequest {
  workOrderId: string;
  lineItemId: string;
}

export interface AddLaborEntryRequest {
  workOrderId: string;
  description: string;
  hours: number;
  hourlyRate: Money;
  mechanicName: string;
}

// ---- Client methods ----

export async function createWorkOrder(data: CreateWorkOrderRequest, correlationId?: string): Promise<WorkOrder> {
  return getClient().call<CreateWorkOrderRequest, WorkOrder>('createWorkOrder', data, 10_000, correlationId);
}

export async function getWorkOrder(id: string, correlationId?: string): Promise<WorkOrder> {
  return getClient().call<{ id: string }, WorkOrder>('getWorkOrder', { id }, 10_000, correlationId);
}

export async function listWorkOrders(
  pagination: Pagination,
  statusFilter?: WorkOrderStatus,
  customerIdFilter?: string,
  correlationId?: string,
): Promise<ListWorkOrdersResponse> {
  return getClient().call<object, ListWorkOrdersResponse>('listWorkOrders', {
    pagination,
    statusFilter: statusFilter ?? 'WORK_ORDER_STATUS_UNSPECIFIED',
    customerIdFilter: customerIdFilter ?? '',
  }, 10_000, correlationId);
}

export async function updateWorkOrderStatus(
  data: UpdateWorkOrderStatusRequest,
  correlationId?: string,
): Promise<WorkOrder> {
  return getClient().call<UpdateWorkOrderStatusRequest, WorkOrder>('updateWorkOrderStatus', data, 10_000, correlationId);
}

export async function addLineItem(data: AddLineItemRequest, correlationId?: string): Promise<WorkOrder> {
  return getClient().call<AddLineItemRequest, WorkOrder>('addLineItem', data, 10_000, correlationId);
}

export async function removeLineItem(data: RemoveLineItemRequest, correlationId?: string): Promise<WorkOrder> {
  return getClient().call<RemoveLineItemRequest, WorkOrder>('removeLineItem', data, 10_000, correlationId);
}

export async function addLaborEntry(data: AddLaborEntryRequest, correlationId?: string): Promise<WorkOrder> {
  return getClient().call<AddLaborEntryRequest, WorkOrder>('addLaborEntry', data, 10_000, correlationId);
}
