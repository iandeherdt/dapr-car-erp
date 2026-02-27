'use client';

import React, { useState } from 'react';
import { Search, Plus, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { LoadingOverlay, EmptyState } from '@car-erp/shared-ui';
import { eventBus } from '@car-erp/event-bus';
import type { Customer } from '@car-erp/shared-types';
import { useCustomers } from '@/hooks/use-customers';

const PAGE_SIZE = 20;

export default function CustomerListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isError, error } = useCustomers(
    page,
    PAGE_SIZE,
    search,
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleRowClick = (customer: Customer) => {
    eventBus.emit('navigate', { path: `/customers/${customer.id}` });
  };

  const handleNewCustomer = () => {
    eventBus.emit('navigate', { path: '/customers/new' });
  };

  const customers = data?.data ?? [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          {pagination && (
            <p className="mt-1 text-sm text-gray-500">
              {pagination.totalCount} customer
              {pagination.totalCount !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <button
          onClick={handleNewCustomer}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" />
          New Customer
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, email or phone..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setPage(1);
            }}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Content */}
      {isLoading ? (
        <LoadingOverlay message="Loading customers..." />
      ) : isError ? (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Failed to load customers:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search
              ? `No customers match "${search}". Try a different search.`
              : 'Get started by adding your first customer.'
          }
          icon={<Users className="h-6 w-6" />}
          action={
            !search ? (
              <button
                onClick={handleNewCustomer}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                New Customer
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Table */}
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Vehicles
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => handleRowClick(customer)}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold leading-none text-blue-700 select-none">
                          {customer.firstName[0]}
                          {customer.lastName[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {customer.firstName} {customer.lastName}
                          </div>
                          {customer.companyName && (
                            <div className="text-xs text-gray-500">
                              {customer.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {customer.email || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {customer.phone || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                      {customer.city || '-'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                        {customer.vehicles?.length ?? 0} vehicle
                        {(customer.vehicles?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(customer);
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
