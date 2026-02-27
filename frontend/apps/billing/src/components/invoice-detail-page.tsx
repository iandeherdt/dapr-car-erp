'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, CheckCircle, XCircle } from 'lucide-react';
import {
  formatMoney,
  formatDate,
  StatusBadge,
  MoneyDisplay,
  LoadingOverlay,
  EmptyState,
} from '@car-erp/shared-ui';
import type { InvoiceStatus } from '@car-erp/shared-types';
import { useInvoice, useUpdateInvoiceStatus } from '@/hooks/use-invoices';

interface InvoiceDetailPageProps {
  id: string;
  onNavigateBack?: () => void;
}

const LINE_TYPE_LABELS: Record<string, string> = {
  part: 'Part',
  labor: 'Labor',
};

const LINE_TYPE_CLASSES: Record<string, string> = {
  part: 'bg-blue-50 text-blue-700',
  labor: 'bg-purple-50 text-purple-700',
};

const TERMINAL_STATUSES: InvoiceStatus[] = ['paid', 'cancelled'];

export default function InvoiceDetailPage({ id, onNavigateBack }: InvoiceDetailPageProps) {
  const [confirmAction, setConfirmAction] = useState<InvoiceStatus | null>(null);
  const { data: invoice, isLoading, isError } = useInvoice(id);
  const updateStatus = useUpdateInvoiceStatus();

  async function handleStatusUpdate(status: InvoiceStatus) {
    try {
      await updateStatus.mutateAsync({ id, status });
      setConfirmAction(null);
    } catch {
      // error handled by mutation state
    }
  }

  if (isLoading) {
    return <LoadingOverlay message="Loading invoice..." />;
  }

  if (isError || !invoice) {
    return (
      <EmptyState
        title="Invoice not found"
        description="The requested invoice could not be loaded."
        action={
          onNavigateBack ? (
            <button
              onClick={onNavigateBack}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </button>
          ) : undefined
        }
      />
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(invoice.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              Work Order:{' '}
              <span className="font-mono text-xs">{invoice.workOrderId.slice(0, 8)}...</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isTerminal && (
          <div className="flex items-center gap-2">
            {invoice.status === 'draft' && (
              <button
                onClick={() => setConfirmAction('sent')}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                Send Invoice
              </button>
            )}
            {invoice.status === 'sent' && (
              <button
                onClick={() => setConfirmAction('paid')}
                disabled={updateStatus.isPending}
                className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Mark as Paid
              </button>
            )}
            <button
              onClick={() => setConfirmAction('cancelled')}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Cancel Invoice
            </button>
          </div>
        )}
      </div>

      {/* Confirm Action Dialog */}
      {confirmAction && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            {confirmAction === 'sent' && 'Are you sure you want to send this invoice?'}
            {confirmAction === 'paid' && 'Are you sure you want to mark this invoice as paid?'}
            {confirmAction === 'cancelled' && 'Are you sure you want to cancel this invoice? This action cannot be undone.'}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => handleStatusUpdate(confirmAction)}
              disabled={updateStatus.isPending}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {updateStatus.isPending ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
          {updateStatus.isError && (
            <p className="mt-2 text-xs text-red-600">{updateStatus.error?.message}</p>
          )}
        </div>
      )}

      {/* Invoice Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Issued Date</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(invoice.issuedAt)}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Due Date</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">{formatDate(invoice.dueAt)}</dd>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Paid Date</dt>
          <dd className="mt-1 text-sm font-medium text-gray-900">
            {invoice.paidAt ? formatDate(invoice.paidAt) : '-'}
          </dd>
        </div>
      </div>

      {/* Line Items */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Line Items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unit Price
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-3 text-sm text-gray-900">{item.description}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        LINE_TYPE_CLASSES[item.lineType] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {LINE_TYPE_LABELS[item.lineType] || item.lineType}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums text-gray-700">
                    {item.quantity}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums text-gray-700">
                    <MoneyDisplay money={item.unitPrice} />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right text-sm tabular-nums font-medium text-gray-900">
                    <MoneyDisplay money={item.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-gray-200 bg-gray-50 px-5 py-4">
          <div className="ml-auto w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="tabular-nums text-gray-900">{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Tax ({(invoice.taxRate * 100).toFixed(0)}%)
              </span>
              <span className="tabular-nums text-gray-700">{formatMoney(invoice.taxAmount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 text-base font-bold">
              <span className="text-gray-900">Total</span>
              <span className="tabular-nums text-gray-900">{formatMoney(invoice.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Notes</h2>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
        </div>
      )}
    </div>
  );
}
