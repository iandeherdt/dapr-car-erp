'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMoney, formatDate, StatusBadge, LoadingOverlay, EmptyState } from '@car-erp/shared-ui';
import type { InvoiceStatus } from '@car-erp/shared-types';
import { useInvoices } from '@/hooks/use-invoices';

const STATUS_TABS: { label: string; value: InvoiceStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
];

const PAGE_SIZE = 20;

interface InvoiceListPageProps {
  onNavigateToDetail?: (id: string) => void;
}

export default function InvoiceListPage({ onNavigateToDetail }: InvoiceListPageProps) {
  const [page, setPage] = useState(1);
  const [activeStatus, setActiveStatus] = useState<InvoiceStatus | undefined>(undefined);

  const { data, isLoading, isError } = useInvoices(page, PAGE_SIZE, activeStatus);

  function handleStatusChange(status: InvoiceStatus | undefined) {
    setActiveStatus(status);
    setPage(1);
  }

  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-1" aria-label="Invoice status filter">
          {STATUS_TABS.map((tab) => {
            const isActive = activeStatus === tab.value;
            return (
              <button
                key={tab.label}
                onClick={() => handleStatusChange(tab.value)}
                className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingOverlay message="Loading invoices..." />
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load invoices. Please try again.
        </div>
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={
            activeStatus
              ? `No ${activeStatus} invoices found.`
              : 'No invoices have been created yet.'
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
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Work Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Tax
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                      Total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Issued
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Due
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Paid
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {data.data.map((invoice) => (
                    <tr
                      key={invoice.id}
                      onClick={() => onNavigateToDetail?.(invoice.id)}
                      className={`transition-colors hover:bg-gray-50 ${
                        onNavigateToDetail ? 'cursor-pointer' : ''
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-blue-600">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500">
                        {invoice.workOrderId.slice(0, 8)}...
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-700">
                        {formatMoney(invoice.subtotal)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums text-gray-500">
                        {formatMoney(invoice.taxAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sm tabular-nums font-semibold text-gray-900">
                        {formatMoney(invoice.total)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(invoice.issuedAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {formatDate(invoice.dueAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
                      </td>
                    </tr>
                  ))}
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
                {pagination.totalCount} invoices
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
