import type {
  WorkOrder,
  ListWorkOrdersResponse,
  CreateWorkOrderRequest,
  UpdateWorkOrderStatusRequest,
  AddLineItemRequest,
  RemoveLineItemRequest,
  AddLaborEntryRequest,
  WorkOrderStatus,
  Pagination,
} from '../../clients/workorder-client.js';

export interface IWorkOrderService {
  createWorkOrder(data: CreateWorkOrderRequest, correlationId?: string): Promise<WorkOrder>;
  getWorkOrder(id: string, correlationId?: string): Promise<WorkOrder>;
  listWorkOrders(
    pagination: Pagination,
    statusFilter?: WorkOrderStatus,
    customerIdFilter?: string,
    correlationId?: string,
  ): Promise<ListWorkOrdersResponse>;
  updateWorkOrderStatus(data: UpdateWorkOrderStatusRequest, correlationId?: string): Promise<WorkOrder>;
  addLineItem(data: AddLineItemRequest, correlationId?: string): Promise<WorkOrder>;
  removeLineItem(data: RemoveLineItemRequest, correlationId?: string): Promise<WorkOrder>;
  addLaborEntry(data: AddLaborEntryRequest, correlationId?: string): Promise<WorkOrder>;
}
