'use client';

import React from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { eventBus } from '@car-erp/event-bus';
import { useCreateCustomer } from '@/hooks/use-customers';
import { CustomerForm, type CustomerFormValues } from './customer-form';

export default function CustomerNewPage() {
  const createCustomer = useCreateCustomer();

  const handleBack = () => {
    eventBus.emit('navigate', { path: '/customers' });
  };

  const handleSubmit = async (values: CustomerFormValues) => {
    const customer = await createCustomer.mutateAsync({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email ?? '',
      phone: values.phone ?? '',
      addressLine1: values.addressLine1 ?? '',
      addressLine2: values.addressLine2 ?? '',
      city: values.city ?? '',
      postalCode: values.postalCode ?? '',
      country: values.country ?? '',
      companyName: values.companyName ?? '',
      vatNumber: values.vatNumber ?? '',
    });

    eventBus.emit('customer:created', { customer });
    eventBus.emit('navigate', { path: '/customers' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Customer</h1>
            <p className="text-sm text-gray-500">
              Add a new customer to the system
            </p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        {createCustomer.isError && (
          <div className="mb-4 rounded-md bg-red-50 p-3">
            <p className="text-sm text-red-700">
              Failed to create customer:{' '}
              {createCustomer.error instanceof Error
                ? createCustomer.error.message
                : 'Unknown error'}
            </p>
          </div>
        )}

        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={handleBack}
          isSubmitting={createCustomer.isPending}
          submitLabel="Create Customer"
        />
      </div>
    </div>
  );
}
