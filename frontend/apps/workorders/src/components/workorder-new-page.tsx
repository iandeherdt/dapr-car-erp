'use client';

import React from 'react';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { eventBus } from '@car-erp/event-bus';
import { useCreateWorkOrder } from '@/hooks/use-workorders';
import { WorkOrderForm, type WorkOrderFormValues } from './workorder-form';

export default function WorkOrderNewPage() {
  const createWorkOrder = useCreateWorkOrder();

  const handleBack = () => {
    eventBus.emit('navigate', { path: '/work-orders' });
  };

  const handleSubmit = async (values: WorkOrderFormValues) => {
    const workOrder = await createWorkOrder.mutateAsync({
      customerId: values.customerId,
      vehicleId: values.vehicleId,
      description: values.description,
      assignedMechanic: values.assignedMechanic ?? '',
      notes: values.notes ?? '',
    });

    eventBus.emit('workorder:created', { workOrderId: workOrder.id });
    eventBus.emit('navigate', { path: `/work-orders/${workOrder.id}` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Work Orders
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <ClipboardList className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Work Order
            </h1>
            <p className="text-sm text-gray-500">
              Create a new work order for a customer vehicle
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {createWorkOrder.isError && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Failed to create work order:{' '}
              {createWorkOrder.error instanceof Error
                ? createWorkOrder.error.message
                : 'Unknown error'}
            </p>
          </div>
        )}

        <WorkOrderForm
          onSubmit={handleSubmit}
          onCancel={handleBack}
          isSubmitting={createWorkOrder.isPending}
          submitLabel="Create Work Order"
          listenForCustomerEvent
        />
      </div>
    </div>
  );
}
