'use client';

import React, { useState } from 'react';
import { Plus, AlertTriangle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney, LoadingOverlay, EmptyState } from '@car-erp/shared-ui';
import { useParts, useLowStockParts, useCreatePart } from '@/hooks/use-inventory';
import { StockIndicator } from './stock-indicator';
import { PartForm } from './part-form';
import type { CreatePartInput } from '@car-erp/shared-types';

const CATEGORIES = [
  'All',
  'Filters',
  'Brakes',
  'Engine',
  'Transmission',
  'Suspension',
  'Electrical',
  'Exhaust',
  'Cooling',
  'Other',
];

interface PartsListPageProps {
  onNavigateToDetail?: (id: string) => void;
}

export default function PartsListPage({ onNavigateToDetail }: PartsListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const PAGE_SIZE = 20;

  const partsQuery = useParts(page, PAGE_SIZE, selectedCategory || undefined, search || undefined);
  const lowStockQuery = useLowStockParts(page, PAGE_SIZE);
  const createPart = useCreatePart();

  const activeQuery = showLowStock ? lowStockQuery : partsQuery;
  const { data, isLoading, isError } = activeQuery;

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    setSelectedCategory(value === 'All' ? '' : value);
    setPage(1);
  }

  function handleLowStockToggle() {
    setShowLowStock((prev) => !prev);
    setPage(1);
  }

  async function handleCreatePart(input: CreatePartInput) {
    try {
      await createPart.mutateAsync(input);
      setShowCreateForm(false);
    } catch {
      // error handled by mutation state
    }
  }

  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleLowStockToggle}
            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              showLowStock
                ? 'border-yellow-400 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            Low Stock
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            Add Part
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">New Part</h2>
          <PartForm
            isCreate
            onSubmit={handleCreatePart}
            onCancel={() => setShowCreateForm(false)}
            isLoading={createPart.isPending}
          />
          {createPart.isError && (
            <p className="mt-2 text-sm text-red-600">{createPart.error?.message}</p>
          )}
        </div>
      )}

      {/* Filters */}
      {!showLowStock && (
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex flex-1 items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search parts by name or SKU..."
                className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Search
            </button>
          </form>
          <select
            value={selectedCategory || 'All'}
            onChange={handleCategoryChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <LoadingOverlay message="Loading parts..." />
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load parts. Please try again.
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No parts found"
          description={
            showLowStock
              ? 'All parts are adequately stocked.'
              : 'No parts match your search criteria.'
          }
          action={
            !showLowStock ? (
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add your first part
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Manufacturer
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Reserved
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Available
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.data.map((part) => {
                    const available = part.quantityInStock - part.quantityReserved;
                    return (
                      <tr
                        key={part.id}
                        onClick={() => onNavigateToDetail?.(part.id)}
                        className={`transition-colors hover:bg-gray-50 ${
                          onNavigateToDetail ? 'cursor-pointer' : ''
                        }`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-600">
                          {part.sku}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {part.name}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {part.category || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                          {part.manufacturer || '-'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                          {formatMoney(part.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-900">
                          {part.quantityInStock}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-500">
                          {part.quantityReserved}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-medium text-gray-900">
                          {available}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <StockIndicator
                            available={available}
                            reorderLevel={part.reorderLevel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
                {pagination.totalCount} parts
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
