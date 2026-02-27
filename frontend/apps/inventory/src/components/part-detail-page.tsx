'use client';

import React, { useState } from 'react';
import { ArrowLeft, Edit2 } from 'lucide-react';
import { formatMoney, MoneyDisplay, LoadingOverlay, EmptyState } from '@car-erp/shared-ui';
import { usePart, useUpdatePart } from '@/hooks/use-inventory';
import { StockIndicator } from './stock-indicator';
import { PartForm } from './part-form';
import type { CreatePartInput } from '@car-erp/shared-types';

interface PartDetailPageProps {
  id: string;
  onNavigateBack?: () => void;
}

export default function PartDetailPage({ id, onNavigateBack }: PartDetailPageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: part, isLoading, isError } = usePart(id);
  const updatePart = useUpdatePart();

  async function handleUpdate(input: CreatePartInput) {
    try {
      await updatePart.mutateAsync({ id, data: input });
      setIsEditing(false);
    } catch {
      // error handled by mutation state
    }
  }

  if (isLoading) {
    return <LoadingOverlay message="Loading part details..." />;
  }

  if (isError || !part) {
    return (
      <EmptyState
        title="Part not found"
        description="The requested part could not be loaded."
        action={
          onNavigateBack ? (
            <button
              onClick={onNavigateBack}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </button>
          ) : undefined
        }
      />
    );
  }

  const available = part.quantityInStock - part.quantityReserved;
  const margin =
    part.unitPrice.amountCents > 0
      ? Math.round(
          ((part.unitPrice.amountCents - part.costPrice.amountCents) /
            part.unitPrice.amountCents) *
            100
        )
      : 0;

  const stockPercentage =
    part.reorderLevel > 0
      ? Math.min(100, Math.round((available / (part.reorderLevel * 2)) * 100))
      : available > 0
      ? 100
      : 0;

  function getBarColor() {
    if (available === 0) return 'bg-red-500';
    if (available <= part.reorderLevel) return 'bg-yellow-400';
    return 'bg-green-500';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{part.name}</h1>
            <p className="font-mono text-sm text-gray-500">{part.sku}</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="rounded-lg border border-blue-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Edit Part</h2>
          <PartForm
            part={part}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
            isLoading={updatePart.isPending}
          />
          {updatePart.isError && (
            <p className="mt-2 text-sm text-red-600">{updatePart.error?.message}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Part Info */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Part Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">SKU</dt>
              <dd className="mt-0.5 font-mono text-sm font-medium text-gray-900">{part.sku}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Name</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{part.name}</dd>
            </div>
            {part.description && (
              <div>
                <dt className="text-xs text-gray-500">Description</dt>
                <dd className="mt-0.5 text-sm text-gray-600">{part.description}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-500">Category</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{part.category || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Manufacturer</dt>
              <dd className="mt-0.5 text-sm text-gray-900">{part.manufacturer || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Pricing */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Pricing
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-xs text-gray-500">Unit Price</dt>
              <dd className="mt-0.5 text-lg font-semibold text-gray-900">
                <MoneyDisplay money={part.unitPrice} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Cost Price</dt>
              <dd className="mt-0.5 text-sm text-gray-700">
                <MoneyDisplay money={part.costPrice} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Margin</dt>
              <dd
                className={`mt-0.5 text-sm font-medium ${
                  margin >= 0 ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {margin}%
              </dd>
            </div>
          </dl>
        </div>

        {/* Stock */}
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Stock Levels
          </h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">In Stock</dt>
              <dd className="text-sm font-medium text-gray-900">{part.quantityInStock}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Reserved</dt>
              <dd className="text-sm font-medium text-gray-700">{part.quantityReserved}</dd>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <dt className="text-sm font-medium text-gray-700">Available</dt>
              <dd className="text-sm font-bold text-gray-900">{available}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Reorder Level</dt>
              <dd className="text-sm text-gray-700">{part.reorderLevel}</dd>
            </div>

            {/* Stock bar */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Stock Level</span>
                <StockIndicator available={available} reorderLevel={part.reorderLevel} />
              </div>
              <div className="h-2.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-2.5 rounded-full transition-all ${getBarColor()}`}
                  style={{ width: `${stockPercentage}%` }}
                />
              </div>
            </div>
          </dl>
        </div>
      </div>

      {/* Location and Compatible Makes */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Location
          </h2>
          <p className="text-sm text-gray-900">{part.location || 'Not specified'}</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Compatible Makes
          </h2>
          {part.compatibleMakes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {part.compatibleMakes.map((make) => (
                <span
                  key={make}
                  className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700"
                >
                  {make}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No compatible makes specified</p>
          )}
        </div>
      </div>
    </div>
  );
}
