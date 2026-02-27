'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Part, CreatePartInput } from '@car-erp/shared-types';

const partSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().default(''),
  category: z.string().default(''),
  manufacturer: z.string().default(''),
  unitPrice: z.number().positive('Unit price must be positive'),
  costPrice: z.number().positive('Cost price must be positive'),
  initialStock: z.number().int().min(0).optional(),
  reorderLevel: z.number().int().min(0).default(0),
  location: z.string().default(''),
  compatibleMakes: z.string().default(''),
});

type PartFormValues = z.infer<typeof partSchema>;

interface PartFormProps {
  part?: Part;
  onSubmit: (data: CreatePartInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isCreate?: boolean;
}

export function PartForm({ part, onSubmit, onCancel, isLoading, isCreate = false }: PartFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PartFormValues>({
    resolver: zodResolver(partSchema),
    defaultValues: part
      ? {
          sku: part.sku,
          name: part.name,
          description: part.description,
          category: part.category,
          manufacturer: part.manufacturer,
          unitPrice: part.unitPrice.amountCents / 100,
          costPrice: part.costPrice.amountCents / 100,
          reorderLevel: part.reorderLevel,
          location: part.location,
          compatibleMakes: part.compatibleMakes.join(', '),
        }
      : {
          unitPrice: 0,
          costPrice: 0,
          initialStock: 0,
          reorderLevel: 0,
        },
  });

  function handleFormSubmit(values: PartFormValues) {
    const input: CreatePartInput = {
      sku: values.sku,
      name: values.name,
      description: values.description,
      category: values.category,
      manufacturer: values.manufacturer,
      unitPrice: { amountCents: Math.round(values.unitPrice * 100), currency: 'EUR' },
      costPrice: { amountCents: Math.round(values.costPrice * 100), currency: 'EUR' },
      quantityInStock: values.initialStock ?? 0,
      reorderLevel: values.reorderLevel,
      location: values.location,
      compatibleMakes: values.compatibleMakes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onSubmit(input);
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">SKU *</label>
          <input
            {...register('sku')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. OIL-FILTER-001"
          />
          {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            {...register('name')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Part name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Part description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Category</label>
          <input
            {...register('category')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Filters"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Manufacturer</label>
          <input
            {...register('manufacturer')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Mann"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Unit Price (EUR) *</label>
          <input
            {...register('unitPrice', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.unitPrice && (
            <p className="mt-1 text-xs text-red-600">{errors.unitPrice.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cost Price (EUR) *</label>
          <input
            {...register('costPrice', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0.00"
          />
          {errors.costPrice && (
            <p className="mt-1 text-xs text-red-600">{errors.costPrice.message}</p>
          )}
        </div>

        {isCreate && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Initial Stock</label>
            <input
              {...register('initialStock', { valueAsNumber: true })}
              type="number"
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="0"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
          <input
            {...register('reorderLevel', { valueAsNumber: true })}
            type="number"
            min="0"
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Location</label>
          <input
            {...register('location')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Shelf A3"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Compatible Makes (comma-separated)
          </label>
          <input
            {...register('compatibleMakes')}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. BMW, Audi, Mercedes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : part ? 'Update Part' : 'Create Part'}
        </button>
      </div>
    </form>
  );
}
