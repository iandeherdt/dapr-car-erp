'use client';

import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { StatusBadge, LoadingOverlay, EmptyState, formatDate } from '@car-erp/shared-ui';
import { eventBus } from '@car-erp/event-bus';
import type { WorkOrder, WorkOrderStatus } from '@car-erp/shared-types';
import { useWorkOrders } from '@/hooks/use-workorders';

const PAGE_SIZE = 20;

type StatusFilter = 'all' | WorkOrderStatus;

const STATUS_TABS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Awaiting Parts', value: 'awaiting_parts' },
  { label: 'Completed', value: 'completed' },
];

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export default function WorkOrderListPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { data, isLoading, isError, error } = useWorkOrders(
    page,
    PAGE_SIZE,
    statusFilter === 'all' ? '' : statusFilter,
  );

  const handleRowClick = (workOrder: WorkOrder) => {
    eventBus.emit('navigate', { path: `/work-orders/${workOrder.id}` });
  };

  const handleNewWorkOrder = () => {
    eventBus.emit('navigate', { path: '/work-orders/new' });
  };

  const handleStatusChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const workOrders = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          {pagination && (
            <p className="mt-1 text-sm text-gray-500">
              {pagination.totalCount} work order
              {pagination.totalCount !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <button
          onClick={handleNewWorkOrder}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-0 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingOverlay message="Loading work orders..." />
      ) : isError ? (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Failed to load work orders:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : workOrders.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description={
            statusFilter !== 'all'
              ? `No work orders with status "${statusFilter.replace(/_/g, ' ')}".`
              : 'Get started by creating your first work order.'
          }
          icon={<ClipboardList className="h-6 w-6" />}
          action={
            statusFilter === 'all' ? (
              <button
                onClick={handleNewWorkOrder}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New Work Order
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Vehicle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Mechanic
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Est. Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {workOrders.map((wo) => (
                    <tr
                      key={wo.id}
                      onClick={() => handleRowClick(wo)}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="font-mono text-xs font-medium text-gray-700 bg-gray-100 rounded px-2 py-0.5">
                          {shortId(wo.id)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {wo.customerId ? (
                          <span className="font-mono text-xs text-gray-400">
                            {shortId(wo.customerId)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {wo.vehicleId ? (
                          <span className="font-mono text-xs text-gray-400">
                            {shortId(wo.vehicleId)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                        {wo.assignedMechanic || '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {wo.estimatedTotal
                          ? new Intl.NumberFormat('nl-BE', {
                              style: 'currency',
                              currency: wo.estimatedTotal.currency || 'EUR',
                            }).format(wo.estimatedTotal.amountCents / 100)
                          : '-'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                        {formatDate(wo.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(wo);
                          }}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(page - 1) * PAGE_SIZE + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(page * PAGE_SIZE, pagination.totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.totalCount}</span>{' '}
                results
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
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
