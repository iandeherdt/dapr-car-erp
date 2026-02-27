'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { eventBus } from '@car-erp/event-bus';

const workOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  vehicleId: z.string().min(1, 'Vehicle ID is required'),
  description: z.string().min(1, 'Description is required'),
  assignedMechanic: z.string().optional(),
  notes: z.string().optional(),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  defaultValues?: Partial<WorkOrderFormValues>;
  onSubmit: (values: WorkOrderFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  listenForCustomerEvent?: boolean;
}

export function WorkOrderForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save',
  listenForCustomerEvent = false,
}: WorkOrderFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      customerId: defaultValues?.customerId ?? '',
      vehicleId: defaultValues?.vehicleId ?? '',
      description: defaultValues?.description ?? '',
      assignedMechanic: defaultValues?.assignedMechanic ?? '',
      notes: defaultValues?.notes ?? '',
    },
  });

  // Listen for 'customer:selected' event to auto-fill customerId
  useEffect(() => {
    if (!listenForCustomerEvent) return;
    const unsubscribe = eventBus.on('customer:selected', ({ customerId }) => {
      setValue('customerId', customerId, { shouldValidate: true });
    });
    return unsubscribe;
  }, [listenForCustomerEvent, setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Customer ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Customer ID <span className="text-red-500">*</span>
        </label>
        <input
          {...register('customerId')}
          type="text"
          placeholder="Enter customer ID"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.customerId && (
          <p className="mt-1 text-xs text-red-600">
            {errors.customerId.message}
          </p>
        )}
        {listenForCustomerEvent && (
          <p className="mt-1 text-xs text-gray-400">
            This field will be auto-filled when a customer is selected from the
            customer list.
          </p>
        )}
      </div>

      {/* Vehicle ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Vehicle ID <span className="text-red-500">*</span>
        </label>
        <input
          {...register('vehicleId')}
          type="text"
          placeholder="Enter vehicle ID"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.vehicleId && (
          <p className="mt-1 text-xs text-red-600">
            {errors.vehicleId.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Describe the work to be done..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Assigned Mechanic */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Assigned Mechanic
        </label>
        <input
          {...register('assignedMechanic')}
          type="text"
          placeholder="Mechanic name"
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Additional notes..."
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
