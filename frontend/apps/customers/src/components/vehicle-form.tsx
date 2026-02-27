'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Vehicle } from '@car-erp/shared-types';

const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z
    .number({ invalid_type_error: 'Year must be a number' })
    .int()
    .min(1900, 'Year must be after 1900')
    .max(new Date().getFullYear() + 1, 'Year is too far in the future'),
  vin: z.string().optional(),
  licensePlate: z.string().min(1, 'License plate is required'),
  mileageKm: z
    .number({ invalid_type_error: 'Mileage must be a number' })
    .int()
    .min(0, 'Mileage cannot be negative')
    .optional(),
  color: z.string().optional(),
  engineType: z.string().optional(),
});

export type VehicleFormValues = z.infer<typeof vehicleSchema>;

const ENGINE_TYPES = [
  { value: '', label: 'Select engine type' },
  { value: 'gasoline', label: 'Gasoline' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'plugin_hybrid', label: 'Plug-in Hybrid' },
  { value: 'lpg', label: 'LPG' },
  { value: 'hydrogen', label: 'Hydrogen' },
  { value: 'other', label: 'Other' },
];

interface VehicleFormProps {
  defaultValues?: Partial<VehicleFormValues>;
  onSubmit: (values: VehicleFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: defaultValues?.make ?? '',
      model: defaultValues?.model ?? '',
      year: defaultValues?.year ?? new Date().getFullYear(),
      vin: defaultValues?.vin ?? '',
      licensePlate: defaultValues?.licensePlate ?? '',
      mileageKm: defaultValues?.mileageKm ?? 0,
      color: defaultValues?.color ?? '',
      engineType: defaultValues?.engineType ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Make */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Make <span className="text-red-500">*</span>
          </label>
          <input
            {...register('make')}
            type="text"
            placeholder="e.g. Toyota"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.make && (
            <p className="mt-1 text-xs text-red-600">{errors.make.message}</p>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Model <span className="text-red-500">*</span>
          </label>
          <input
            {...register('model')}
            type="text"
            placeholder="e.g. Corolla"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.model && (
            <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>
          )}
        </div>

        {/* Year */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Year <span className="text-red-500">*</span>
          </label>
          <input
            {...register('year', { valueAsNumber: true })}
            type="number"
            placeholder="e.g. 2020"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.year && (
            <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>
          )}
        </div>

        {/* License Plate */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            License Plate <span className="text-red-500">*</span>
          </label>
          <input
            {...register('licensePlate')}
            type="text"
            placeholder="e.g. 1-ABC-123"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.licensePlate && (
            <p className="mt-1 text-xs text-red-600">
              {errors.licensePlate.message}
            </p>
          )}
        </div>

        {/* VIN */}
        <div>
          <label className="block text-sm font-medium text-gray-700">VIN</label>
          <input
            {...register('vin')}
            type="text"
            placeholder="17-character VIN"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Mileage */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mileage (km)
          </label>
          <input
            {...register('mileageKm', { valueAsNumber: true })}
            type="number"
            min={0}
            placeholder="e.g. 50000"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {errors.mileageKm && (
            <p className="mt-1 text-xs text-red-600">
              {errors.mileageKm.message}
            </p>
          )}
        </div>

        {/* Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Color
          </label>
          <input
            {...register('color')}
            type="text"
            placeholder="e.g. Silver"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Engine Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Engine Type
          </label>
          <select
            {...register('engineType')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {ENGINE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
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
          {isSubmitting ? 'Saving...' : 'Save Vehicle'}
        </button>
      </div>
    </form>
  );
}
