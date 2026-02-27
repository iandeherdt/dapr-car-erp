'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Edit2,
  Car,
  Plus,
  User,
  MapPin,
  Building2,
  X,
  Pencil,
} from 'lucide-react';
import { LoadingOverlay, EmptyState, formatDate } from '@car-erp/shared-ui';
import { eventBus } from '@car-erp/event-bus';
import type { Vehicle } from '@car-erp/shared-types';
import {
  useCustomer,
  useUpdateCustomer,
  useAddVehicle,
  useUpdateVehicle,
} from '@/hooks/use-customers';
import { CustomerForm, type CustomerFormValues } from './customer-form';
import { VehicleForm, type VehicleFormValues } from './vehicle-form';

interface CustomerDetailPageProps {
  id: string;
}

export default function CustomerDetailPage({ id }: CustomerDetailPageProps) {
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);

  const { data: customer, isLoading, isError, error } = useCustomer(id);
  const updateCustomer = useUpdateCustomer();
  const addVehicle = useAddVehicle();
  const updateVehicle = useUpdateVehicle();

  const handleBack = () => {
    eventBus.emit('navigate', { path: '/customers' });
  };

  const handleEditSubmit = async (values: CustomerFormValues) => {
    if (!customer) return;
    await updateCustomer.mutateAsync({
      id: customer.id,
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
    setIsEditingCustomer(false);
    eventBus.emit('customer:updated', { customer: { ...customer, ...values } as any });
  };

  const handleAddVehicle = async (values: VehicleFormValues) => {
    await addVehicle.mutateAsync({
      customerId: id,
      make: values.make,
      model: values.model,
      year: values.year,
      vin: values.vin ?? '',
      licensePlate: values.licensePlate,
      mileageKm: values.mileageKm ?? 0,
      color: values.color ?? '',
      engineType: values.engineType ?? '',
    });
    setShowAddVehicle(false);
  };

  const handleUpdateVehicle = async (
    vehicleId: string,
    values: VehicleFormValues,
  ) => {
    await updateVehicle.mutateAsync({
      customerId: id,
      vehicleId,
      make: values.make,
      model: values.model,
      year: values.year,
      vin: values.vin ?? '',
      licensePlate: values.licensePlate,
      mileageKm: values.mileageKm ?? 0,
      color: values.color ?? '',
      engineType: values.engineType ?? '',
    });
    setEditingVehicleId(null);
  };

  if (isLoading) return <LoadingOverlay message="Loading customer..." />;

  if (isError || !customer) {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Customers
        </button>
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {isError
              ? `Failed to load customer: ${error instanceof Error ? error.message : 'Unknown error'}`
              : 'Customer not found.'}
          </p>
        </div>
      </div>
    );
  }

  const editingVehicle = editingVehicleId
    ? customer.vehicles?.find((v) => v.id === editingVehicleId)
    : null;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customers
      </button>

      {/* Customer info card */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold leading-none text-blue-700 select-none">
              {customer.firstName[0]}
              {customer.lastName[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {customer.firstName} {customer.lastName}
              </h1>
              {customer.companyName && (
                <p className="text-sm text-gray-500">{customer.companyName}</p>
              )}
              <p className="text-xs text-gray-400">
                Customer since {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditingCustomer(true)}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Edit2 className="h-4 w-4" />
            Edit
          </button>
        </div>

        {isEditingCustomer ? (
          <div className="p-6">
            <h2 className="mb-4 text-base font-semibold text-gray-900">
              Edit Customer
            </h2>
            <CustomerForm
              defaultValues={{
                firstName: customer.firstName,
                lastName: customer.lastName,
                email: customer.email,
                phone: customer.phone,
                addressLine1: customer.addressLine1,
                addressLine2: customer.addressLine2,
                city: customer.city,
                postalCode: customer.postalCode,
                country: customer.country,
                companyName: customer.companyName,
                vatNumber: customer.vatNumber,
              }}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditingCustomer(false)}
              isSubmitting={updateCustomer.isPending}
              submitLabel="Update Customer"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
            {/* Contact */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <User className="h-4 w-4 text-gray-400" />
                Contact
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {customer.email && (
                  <p>
                    <span className="text-gray-400">Email: </span>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {customer.email}
                    </a>
                  </p>
                )}
                {customer.phone && (
                  <p>
                    <span className="text-gray-400">Phone: </span>
                    {customer.phone}
                  </p>
                )}
                {!customer.email && !customer.phone && (
                  <p className="italic text-gray-400">No contact info</p>
                )}
              </div>
            </div>

            {/* Address */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <MapPin className="h-4 w-4 text-gray-400" />
                Address
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {customer.addressLine1 ? (
                  <>
                    <p>{customer.addressLine1}</p>
                    {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                    <p>
                      {[customer.postalCode, customer.city]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                    {customer.country && <p>{customer.country}</p>}
                  </>
                ) : (
                  <p className="italic text-gray-400">No address on file</p>
                )}
              </div>
            </div>

            {/* Business */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Building2 className="h-4 w-4 text-gray-400" />
                Business
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                {customer.companyName && (
                  <p>
                    <span className="text-gray-400">Company: </span>
                    {customer.companyName}
                  </p>
                )}
                {customer.vatNumber && (
                  <p>
                    <span className="text-gray-400">VAT: </span>
                    {customer.vatNumber}
                  </p>
                )}
                {!customer.companyName && !customer.vatNumber && (
                  <p className="italic text-gray-400">No business info</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vehicles section */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-gray-500" />
            <h2 className="text-base font-semibold text-gray-900">
              Vehicles ({customer.vehicles?.length ?? 0})
            </h2>
          </div>
          <button
            onClick={() => {
              setShowAddVehicle(true);
              setEditingVehicleId(null);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Vehicle
          </button>
        </div>

        {/* Add vehicle form */}
        {showAddVehicle && (
          <div className="border-b border-gray-200 bg-blue-50 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Add New Vehicle
              </h3>
              <button
                onClick={() => setShowAddVehicle(false)}
                className="inline-flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <VehicleForm
              onSubmit={handleAddVehicle}
              onCancel={() => setShowAddVehicle(false)}
              isSubmitting={addVehicle.isPending}
            />
          </div>
        )}

        {/* Vehicle list */}
        {!customer.vehicles || customer.vehicles.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No vehicles registered"
              description="Add a vehicle to start tracking work orders for this customer."
              icon={<Car className="h-6 w-6" />}
              action={
                <button
                  onClick={() => setShowAddVehicle(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Vehicle
                </button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {customer.vehicles.map((vehicle: Vehicle) => (
              <div key={vehicle.id}>
                {editingVehicleId === vehicle.id ? (
                  <div className="bg-blue-50 p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Edit Vehicle
                      </h3>
                      <button
                        onClick={() => setEditingVehicleId(null)}
                        className="inline-flex items-center justify-center rounded text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <VehicleForm
                      defaultValues={{
                        make: vehicle.make,
                        model: vehicle.model,
                        year: vehicle.year,
                        vin: vehicle.vin,
                        licensePlate: vehicle.licensePlate,
                        mileageKm: vehicle.mileageKm,
                        color: vehicle.color,
                        engineType: vehicle.engineType,
                      }}
                      onSubmit={(values) =>
                        handleUpdateVehicle(vehicle.id, values)
                      }
                      onCancel={() => setEditingVehicleId(null)}
                      isSubmitting={updateVehicle.isPending}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                        <Car className="h-5 w-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{vehicle.licensePlate}</span>
                          {vehicle.vin && <span>VIN: {vehicle.vin}</span>}
                          {vehicle.mileageKm > 0 && (
                            <span>{vehicle.mileageKm.toLocaleString()} km</span>
                          )}
                          {vehicle.engineType && (
                            <span className="capitalize">
                              {vehicle.engineType.replace(/_/g, ' ')}
                            </span>
                          )}
                          {vehicle.color && <span>{vehicle.color}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditingVehicleId(vehicle.id);
                        setShowAddVehicle(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
