import * as grpc from '@grpc/grpc-js';
import { Customer, Vehicle, Prisma } from '@prisma/client';
import prisma from '../infrastructure/prisma.js';
import { publishEvent } from '../events/publisher.js';

type CustomerWithVehicles = Customer & { vehicles: Vehicle[] };

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

function mapVehicle(v: Vehicle) {
  return {
    id: v.id,
    customerId: v.customerId,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin ?? '',
    licensePlate: v.licensePlate ?? '',
    mileageKm: v.mileageKm,
    color: v.color ?? '',
    engineType: v.engineType ?? '',
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

function mapCustomer(c: CustomerWithVehicles) {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email ?? '',
    phone: c.phone ?? '',
    addressLine1: c.addressLine1,
    addressLine2: c.addressLine2 ?? '',
    city: c.city,
    postalCode: c.postalCode,
    country: c.country,
    companyName: c.companyName ?? '',
    vatNumber: c.vatNumber ?? '',
    vehicles: c.vehicles.map(mapVehicle),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// gRPC handler implementations
// ---------------------------------------------------------------------------

export async function createCustomer(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const req = call.request;

    const customer = await prisma.customer.create({
      data: {
        firstName: req.firstName,
        lastName: req.lastName,
        email: req.email || null,
        phone: req.phone || null,
        addressLine1: req.addressLine1,
        addressLine2: req.addressLine2 || null,
        city: req.city,
        postalCode: req.postalCode,
        country: req.country || 'Belgium',
        companyName: req.companyName || null,
        vatNumber: req.vatNumber || null,
      },
      include: { vehicles: true },
    });

    await publishEvent('customer.created', { customerId: customer.id, email: customer.email });

    callback(null, mapCustomer(customer));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function getCustomer(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const { id } = call.request;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { vehicles: true },
    });

    if (!customer) {
      callback({ code: grpc.status.NOT_FOUND, message: `Customer ${id} not found` });
      return;
    }

    callback(null, mapCustomer(customer));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function listCustomers(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const req = call.request;

    const page = req.pagination?.page > 0 ? req.pagination.page : 1;
    const pageSize = req.pagination?.pageSize > 0 ? req.pagination.pageSize : 20;
    const skip = (page - 1) * pageSize;
    const searchQuery: string = req.searchQuery ?? '';

    const where: Prisma.CustomerWhereInput = searchQuery
      ? {
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' } },
            { lastName: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
        }
      : {};

    const [customers, totalCount] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        include: { vehicles: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / pageSize);

    callback(null, {
      customers: customers.map(mapCustomer),
      pagination: { totalCount, page, pageSize, totalPages },
    });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function updateCustomer(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const req = call.request;

    const existing = await prisma.customer.findUnique({ where: { id: req.id } });
    if (!existing) {
      callback({ code: grpc.status.NOT_FOUND, message: `Customer ${req.id} not found` });
      return;
    }

    const customer = await prisma.customer.update({
      where: { id: req.id },
      data: {
        firstName: req.firstName || existing.firstName,
        lastName: req.lastName || existing.lastName,
        email: req.email !== undefined && req.email !== '' ? req.email : existing.email,
        phone: req.phone !== undefined && req.phone !== '' ? req.phone : existing.phone,
        addressLine1: req.addressLine1 || existing.addressLine1,
        addressLine2: req.addressLine2 !== undefined && req.addressLine2 !== '' ? req.addressLine2 : existing.addressLine2,
        city: req.city || existing.city,
        postalCode: req.postalCode || existing.postalCode,
        country: req.country || existing.country,
        companyName: req.companyName !== undefined && req.companyName !== '' ? req.companyName : existing.companyName,
        vatNumber: req.vatNumber !== undefined && req.vatNumber !== '' ? req.vatNumber : existing.vatNumber,
      },
      include: { vehicles: true },
    });

    await publishEvent('customer.updated', { customerId: customer.id, email: customer.email });

    callback(null, mapCustomer(customer));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function deleteCustomer(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const { id } = call.request;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing) {
      callback({ code: grpc.status.NOT_FOUND, message: `Customer ${id} not found` });
      return;
    }

    await prisma.customer.delete({ where: { id } });

    callback(null, { success: true });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function addVehicle(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const req = call.request;

    const customer = await prisma.customer.findUnique({ where: { id: req.customerId } });
    if (!customer) {
      callback({ code: grpc.status.NOT_FOUND, message: `Customer ${req.customerId} not found` });
      return;
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        customerId: req.customerId,
        make: req.make,
        model: req.model,
        year: req.year,
        vin: req.vin || null,
        licensePlate: req.licensePlate || null,
        mileageKm: req.mileageKm ?? 0,
        color: req.color || null,
        engineType: req.engineType || null,
      },
    });

    callback(null, mapVehicle(vehicle));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function getVehicle(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const { id } = call.request;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });

    if (!vehicle) {
      callback({ code: grpc.status.NOT_FOUND, message: `Vehicle ${id} not found` });
      return;
    }

    callback(null, mapVehicle(vehicle));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function listVehiclesByCustomer(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const { customerId } = call.request;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      callback({ code: grpc.status.NOT_FOUND, message: `Customer ${customerId} not found` });
      return;
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });

    callback(null, { vehicles: vehicles.map(mapVehicle) });
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}

export async function updateVehicle(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>,
): Promise<void> {
  try {
    const req = call.request;

    const existing = await prisma.vehicle.findUnique({ where: { id: req.id } });
    if (!existing) {
      callback({ code: grpc.status.NOT_FOUND, message: `Vehicle ${req.id} not found` });
      return;
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: req.id },
      data: {
        make: req.make || existing.make,
        model: req.model || existing.model,
        year: req.year || existing.year,
        vin: req.vin !== undefined && req.vin !== '' ? req.vin : existing.vin,
        licensePlate: req.licensePlate !== undefined && req.licensePlate !== '' ? req.licensePlate : existing.licensePlate,
        mileageKm: req.mileageKm !== undefined && req.mileageKm !== 0 ? req.mileageKm : existing.mileageKm,
        color: req.color !== undefined && req.color !== '' ? req.color : existing.color,
        engineType: req.engineType !== undefined && req.engineType !== '' ? req.engineType : existing.engineType,
      },
    });

    callback(null, mapVehicle(vehicle));
  } catch (err) {
    callback({
      code: grpc.status.INTERNAL,
      message: err instanceof Error ? err.message : 'Internal error',
    });
  }
}
