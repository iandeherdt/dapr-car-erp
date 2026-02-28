import type { IWorkOrderService } from '../../application/services/IWorkOrderService.js';
import * as client from '../../clients/workorder-client.js';

export class GrpcWorkOrderService implements IWorkOrderService {
  createWorkOrder(data: client.CreateWorkOrderRequest, correlationId?: string): Promise<client.WorkOrder> {
    return client.createWorkOrder(data, correlationId);
  }

  getWorkOrder(id: string, correlationId?: string): Promise<client.WorkOrder> {
    return client.getWorkOrder(id, correlationId);
  }

  listWorkOrders(
    pagination: client.Pagination,
    statusFilter?: client.WorkOrderStatus,
    customerIdFilter?: string,
    correlationId?: string,
  ): Promise<client.ListWorkOrdersResponse> {
    return client.listWorkOrders(pagination, statusFilter, customerIdFilter, correlationId);
  }

  updateWorkOrderStatus(
    data: client.UpdateWorkOrderStatusRequest,
    correlationId?: string,
  ): Promise<client.WorkOrder> {
    return client.updateWorkOrderStatus(data, correlationId);
  }

  addLineItem(data: client.AddLineItemRequest, correlationId?: string): Promise<client.WorkOrder> {
    return client.addLineItem(data, correlationId);
  }

  removeLineItem(data: client.RemoveLineItemRequest, correlationId?: string): Promise<client.WorkOrder> {
    return client.removeLineItem(data, correlationId);
  }

  addLaborEntry(data: client.AddLaborEntryRequest, correlationId?: string): Promise<client.WorkOrder> {
    return client.addLaborEntry(data, correlationId);
  }
}
