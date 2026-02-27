'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Car,
  User,
  ClipboardList,
  Plus,
  Trash2,
  Wrench,
  CheckCircle,
  PlayCircle,
  Package,
} from 'lucide-react';
import {
  StatusBadge,
  LoadingOverlay,
  EmptyState,
  formatMoney,
  formatDate,
  formatDateTime,
} from '@car-erp/shared-ui';
import { eventBus } from '@car-erp/event-bus';
import type { WorkOrderStatus } from '@car-erp/shared-types';
import {
  useWorkOrder,
  useUpdateWorkOrderStatus,
  useAddLineItem,
  useRemoveLineItem,
  useAddLaborEntry,
} from '@/hooks/use-workorders';

interface WorkOrderDetailPageProps {
  id: string;
}

// ---- Status action definitions ----

interface StatusAction {
  label: string;
  nextStatus: WorkOrderStatus;
  icon: React.ReactNode;
  className: string;
}

const STATUS_ACTIONS: Partial<Record<WorkOrderStatus, StatusAction[]>> = {
  draft: [
    {
      label: 'Submit',
      nextStatus: 'pending',
      icon: <ClipboardList className="h-4 w-4" />,
      className:
        'bg-yellow-500 text-white hover:bg-yellow-600',
    },
  ],
  pending: [
    {
      label: 'Start Work',
      nextStatus: 'in_progress',
      icon: <PlayCircle className="h-4 w-4" />,
      className: 'bg-blue-600 text-white hover:bg-blue-700',
    },
  ],
  in_progress: [
    {
      label: 'Awaiting Parts',
      nextStatus: 'awaiting_parts',
      icon: <Package className="h-4 w-4" />,
      className: 'bg-orange-500 text-white hover:bg-orange-600',
    },
    {
      label: 'Complete',
      nextStatus: 'completed',
      icon: <CheckCircle className="h-4 w-4" />,
      className: 'bg-green-600 text-white hover:bg-green-700',
    },
  ],
  awaiting_parts: [
    {
      label: 'Resume Work',
      nextStatus: 'in_progress',
      icon: <PlayCircle className="h-4 w-4" />,
      className: 'bg-blue-600 text-white hover:bg-blue-700',
    },
  ],
};

// ---- Add Part Form ----

interface AddPartFormProps {
  onSubmit: (partId: string, quantity: number) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function AddPartForm({ onSubmit, onCancel, isSubmitting }: AddPartFormProps) {
  const [partId, setPartId] = useState('');
  const [quantity, setQuantity] = useState(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partId.trim()) return;
    onSubmit(partId.trim(), quantity);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1">
        <label className="block text-xs font-medium text-gray-700">
          Part ID
        </label>
        <input
          type="text"
          value={partId}
          onChange={(e) => setPartId(e.target.value)}
          placeholder="Enter part ID"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="w-24">
        <label className="block text-xs font-medium text-gray-700">
          Quantity
        </label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value, 10))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? 'Adding...' : 'Add'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Cancel
      </button>
    </form>
  );
}

// ---- Add Labor Form ----

interface AddLaborFormProps {
  onSubmit: (
    description: string,
    technicianName: string,
    hours: number,
    rateCents: number,
    currency: string,
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

function AddLaborForm({
  onSubmit,
  onCancel,
  isSubmitting,
}: AddLaborFormProps) {
  const [description, setDescription] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [hours, setHours] = useState(1);
  const [rate, setRate] = useState(75);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit(description, technicianName, hours, rate * 100, 'EUR');
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-gray-700">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Oil change"
          required
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">
          Technician
        </label>
        <input
          type="text"
          value={technicianName}
          onChange={(e) => setTechnicianName(e.target.value)}
          placeholder="Name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Hours</label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          value={hours}
          onChange={(e) => setHours(parseFloat(e.target.value))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">
          Rate (EUR/h)
        </label>
        <input
          type="number"
          min={0}
          value={rate}
          onChange={(e) => setRate(parseFloat(e.target.value))}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Labor'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---- Main Component ----

export default function WorkOrderDetailPage({ id }: WorkOrderDetailPageProps) {
  const [showAddPart, setShowAddPart] = useState(false);
  const [showAddLabor, setShowAddLabor] = useState(false);

  const { data: workOrder, isLoading, isError, error } = useWorkOrder(id);
  const updateStatus = useUpdateWorkOrderStatus();
  const addLineItem = useAddLineItem();
  const removeLineItem = useRemoveLineItem();
  const addLaborEntry = useAddLaborEntry();

  const handleBack = () => {
    eventBus.emit('navigate', { path: '/work-orders' });
  };

  const handleStatusChange = async (nextStatus: WorkOrderStatus) => {
    await updateStatus.mutateAsync({ id, status: nextStatus });
    eventBus.emit('workorder:status-changed', {
      workOrderId: id,
      newStatus: nextStatus,
    });
  };

  const handleAddPart = async (partId: string, quantity: number) => {
    await addLineItem.mutateAsync({ workOrderId: id, partId, quantity });
    setShowAddPart(false);
  };

  const handleRemovePart = async (lineItemId: string) => {
    await removeLineItem.mutateAsync({ workOrderId: id, lineItemId });
  };

  const handleAddLabor = async (
    description: string,
    technicianName: string,
    hoursWorked: number,
    hourlyRateCents: number,
    currency: string,
  ) => {
    await addLaborEntry.mutateAsync({
      workOrderId: id,
      description,
      technicianName,
      hoursWorked,
      hourlyRateCents,
      currency,
    });
    setShowAddLabor(false);
  };

  if (isLoading) return <LoadingOverlay message="Loading work order..." />;

  if (isError || !workOrder) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Work Orders
        </button>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {isError
              ? `Failed to load work order: ${error instanceof Error ? error.message : 'Unknown error'}`
              : 'Work order not found.'}
          </p>
        </div>
      </div>
    );
  }

  const statusActions = STATUS_ACTIONS[workOrder.status] ?? [];
  const lineItems = workOrder.lineItems ?? [];
  const laborEntries = workOrder.laborEntries ?? [];

  return (
    <div className="space-y-6">
      {/* Back */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Work Orders
      </button>

      {/* Work order info card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-medium text-gray-500 bg-gray-100 rounded px-2 py-0.5">
                {id.slice(0, 8).toUpperCase()}
              </span>
              <StatusBadge status={workOrder.status} />
            </div>
            <p className="mt-2 text-sm text-gray-600">
              {workOrder.description}
            </p>
          </div>

          {/* Status actions */}
          {statusActions.length > 0 && (
            <div className="flex items-center gap-2">
              {statusActions.map((action) => (
                <button
                  key={action.nextStatus}
                  onClick={() => handleStatusChange(action.nextStatus)}
                  disabled={updateStatus.isPending}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${action.className}`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
          {/* Work order details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <ClipboardList className="h-4 w-4 text-gray-400" />
              Details
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="text-gray-400">Mechanic: </span>
                {workOrder.assignedMechanic || '-'}
              </p>
              <p>
                <span className="text-gray-400">Created: </span>
                {formatDate(workOrder.createdAt)}
              </p>
              {workOrder.completedAt && (
                <p>
                  <span className="text-gray-400">Completed: </span>
                  {formatDateTime(workOrder.completedAt)}
                </p>
              )}
              {workOrder.notes && (
                <p className="mt-2 text-gray-500 italic">{workOrder.notes}</p>
              )}
            </div>
          </div>

          {/* Customer info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <User className="h-4 w-4 text-gray-400" />
              Customer
            </div>
            {workOrder.customer ? (
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  {workOrder.customer.firstName} {workOrder.customer.lastName}
                </p>
                {workOrder.customer.companyName && (
                  <p className="text-gray-500">
                    {workOrder.customer.companyName}
                  </p>
                )}
                {workOrder.customer.email && (
                  <p>
                    <a
                      href={`mailto:${workOrder.customer.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {workOrder.customer.email}
                    </a>
                  </p>
                )}
                {workOrder.customer.phone && (
                  <p>{workOrder.customer.phone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">
                Customer details not available
              </p>
            )}
          </div>

          {/* Vehicle info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Car className="h-4 w-4 text-gray-400" />
              Vehicle
            </div>
            {workOrder.vehicle ? (
              <div className="space-y-1 text-sm text-gray-600">
                <p className="font-medium text-gray-900">
                  {workOrder.vehicle.year} {workOrder.vehicle.make}{' '}
                  {workOrder.vehicle.model}
                </p>
                <p>
                  <span className="text-gray-400">Plate: </span>
                  {workOrder.vehicle.licensePlate}
                </p>
                {workOrder.vehicle.vin && (
                  <p>
                    <span className="text-gray-400">VIN: </span>
                    {workOrder.vehicle.vin}
                  </p>
                )}
                {workOrder.vehicle.mileageKm > 0 && (
                  <p>
                    <span className="text-gray-400">Mileage: </span>
                    {workOrder.vehicle.mileageKm.toLocaleString()} km
                  </p>
                )}
                {workOrder.vehicle.engineType && (
                  <p className="capitalize">
                    <span className="text-gray-400">Engine: </span>
                    {workOrder.vehicle.engineType.replace(/_/g, ' ')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm italic text-gray-400">
                Vehicle details not available
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Parts ({lineItems.length})
            </h2>
          </div>
          <button
            onClick={() => {
              setShowAddPart(true);
              setShowAddLabor(false);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </button>
        </div>

        {showAddPart && (
          <div className="border-b border-gray-200 bg-blue-50 px-6 py-4">
            <AddPartForm
              onSubmit={handleAddPart}
              onCancel={() => setShowAddPart(false)}
              isSubmitting={addLineItem.isPending}
            />
          </div>
        )}

        {lineItems.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No parts added"
              description="Add parts used in this work order."
              icon={<Package className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Part
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-3 text-sm font-mono text-gray-500">
                      {item.partSku}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {formatMoney(item.unitPrice)}
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {formatMoney(item.total)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleRemovePart(item.id)}
                        disabled={removeLineItem.isPending}
                        className="inline-flex items-center gap-1 rounded text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Labor Entries */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Labor ({laborEntries.length})
            </h2>
          </div>
          <button
            onClick={() => {
              setShowAddLabor(true);
              setShowAddPart(false);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Labor
          </button>
        </div>

        {showAddLabor && (
          <div className="border-b border-gray-200 bg-blue-50 px-6 py-4">
            <AddLaborForm
              onSubmit={handleAddLabor}
              onCancel={() => setShowAddLabor(false)}
              isSubmitting={addLaborEntry.isPending}
            />
          </div>
        )}

        {laborEntries.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No labor entries"
              description="Add labor entries for the work performed."
              icon={<Wrench className="h-6 w-6" />}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Hours
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rate
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {laborEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">
                      {entry.description}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {entry.technicianName || '-'}
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {entry.hoursWorked}h
                    </td>
                    <td className="px-6 py-3 text-right text-sm text-gray-700">
                      {formatMoney(entry.hourlyRate)}/h
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {formatMoney(entry.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-6 py-4">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Totals
          </h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Estimated Total</span>
              <span className="font-medium text-gray-900">
                {formatMoney(workOrder.estimatedTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Actual Total</span>
              <span className="font-semibold text-gray-900">
                {formatMoney(workOrder.actualTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
