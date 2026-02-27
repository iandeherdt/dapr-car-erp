import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Activity, AlertTriangle, FileText, Plus, Wrench } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { StatusBadge, formatMoney, formatDate } from '@car-erp/shared-ui';
import { LoadingOverlay } from '@car-erp/shared-ui';
import type { DashboardStats } from '@car-erp/shared-types';

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => apiFetch<DashboardStats>('/api/dashboard'),
  });

  if (isLoading) {
    return <LoadingOverlay message="Loading dashboard..." />;
  }

  if (isError) {
    return (
      <div className="rounded-lg bg-red-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
        <p className="text-red-700 font-medium">Failed to load dashboard</p>
        <p className="text-red-500 text-sm mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-white border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Customer
          </Link>
          <Link
            href="/work-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Active Work Orders */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Work Orders</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {data?.activeWorkOrderCount ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-full bg-blue-100 p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/work-orders"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all work orders &rarr;
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {data?.lowStockCount ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-full bg-orange-100 p-3">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/inventory"
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              View inventory &rarr;
            </Link>
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Pending Invoices</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">
                {data?.pendingInvoiceCount ?? 0}
              </p>
            </div>
            <div className="flex items-center justify-center rounded-full bg-purple-100 p-3">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/invoices"
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              View invoices &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Work Orders */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">
              Recent Work Orders
            </h2>
          </div>
          <Link
            href="/work-orders"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all
          </Link>
        </div>

        {data?.recentWorkOrders && data.recentWorkOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mechanic</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estimate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentWorkOrders.slice(0, 5).map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">
                      <Link href={`/work-orders/${wo.id}`} className="text-blue-600 hover:text-blue-700">
                        {wo.id.substring(0, 8)}...
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-900 max-w-xs truncate">{wo.description}</td>
                    <td className="px-6 py-3"><StatusBadge status={wo.status} /></td>
                    <td className="px-6 py-3 text-gray-600">{wo.assignedMechanic || '-'}</td>
                    <td className="px-6 py-3 text-gray-900 font-medium">{formatMoney(wo.estimatedTotal)}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(wo.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Wrench className="mx-auto h-8 w-8 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No work orders yet</p>
            <Link href="/work-orders/new" className="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="h-4 w-4" />
              Create first work order
            </Link>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/customers/new" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <Plus className="h-4 w-4 text-gray-500" />
            New Customer
          </Link>
          <Link href="/work-orders/new" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" />
            New Work Order
          </Link>
          <Link href="/inventory" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Check Stock Levels
          </Link>
          <Link href="/invoices" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
            <FileText className="h-4 w-4 text-purple-500" />
            View Invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
