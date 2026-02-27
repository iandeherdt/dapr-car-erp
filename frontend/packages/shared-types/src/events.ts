import type { Customer } from './customer';
import type { WorkOrderStatus } from './workorder';

export interface EventMap {
  'customer:selected': { customerId: string };
  'customer:created': { customer: Customer };
  'customer:updated': { customer: Customer };
  'workorder:created': { workOrderId: string };
  'workorder:status-changed': { workOrderId: string; newStatus: WorkOrderStatus };
  'inventory:low-stock': { partId: string; partName: string; quantity: number };
  'navigate': { path: string };
}
