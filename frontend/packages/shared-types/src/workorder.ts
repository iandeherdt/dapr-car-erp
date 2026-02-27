import type { Money } from './common';

export type WorkOrderStatus =
  | 'draft'
  | 'pending'
  | 'in_progress'
  | 'awaiting_parts'
  | 'completed'
  | 'cancelled'
  | 'invoiced';

export interface WorkOrderLineItem {
  id: string;
  partId: string;
  partSku: string;
  description: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

export interface LaborEntry {
  id: string;
  description: string;
  technicianName: string;
  hoursWorked: number;
  hourlyRate: Money;
  total: Money;
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

export interface CreateWorkOrderInput {
  customerId: string;
  vehicleId: string;
  description: string;
  assignedMechanic: string;
  notes: string;
}
