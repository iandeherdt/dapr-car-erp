import { PrismaClient, Customer, Vehicle } from '@prisma/client';
import { ICustomerRepository, ListCustomersParams, ListCustomersResult } from '../../domain/repositories/ICustomerRepository.js';
import { CustomerEntity, CreateCustomerInput, UpdateCustomerInput } from '../../domain/entities/Customer.js';
import { VehicleEntity } from '../../domain/entities/Vehicle.js';

type PrismaCustomerWithVehicles = Customer & { vehicles: Vehicle[] };

function toVehicleEntity(v: Vehicle): VehicleEntity {
  return {
    id: v.id,
    customerId: v.customerId,
    make: v.make,
    model: v.model,
    year: v.year,
    vin: v.vin,
    licensePlate: v.licensePlate,
    mileageKm: v.mileageKm,
    color: v.color,
    engineType: v.engineType,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

function toCustomerEntity(c: PrismaCustomerWithVehicles): CustomerEntity {
  return {
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    email: c.email,
    phone: c.phone,
    addressLine1: c.addressLine1,
    addressLine2: c.addressLine2,
    city: c.city,
    postalCode: c.postalCode,
    country: c.country,
    companyName: c.companyName,
    vatNumber: c.vatNumber,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    vehicles: c.vehicles.map(toVehicleEntity),
  };
}

export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCustomerInput): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email || null,
        phone: data.phone || null,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || null,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country || 'Belgium',
        companyName: data.companyName || null,
        vatNumber: data.vatNumber || null,
      },
      include: { vehicles: true },
    });
    return toCustomerEntity(customer);
  }

  async findById(id: string): Promise<CustomerEntity | null> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: { vehicles: true },
    });
    return customer ? toCustomerEntity(customer) : null;
  }

  async findMany(params: ListCustomersParams): Promise<ListCustomersResult> {
    const { page, pageSize, searchQuery } = params;
    const skip = (page - 1) * pageSize;
    const where = searchQuery
      ? {
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' as const } },
            { lastName: { contains: searchQuery, mode: 'insensitive' as const } },
            { email: { contains: searchQuery, mode: 'insensitive' as const } },
          ],
        }
      : {};
    const [customers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: pageSize,
        include: { vehicles: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.customer.count({ where }),
    ]);
    return { customers: customers.map(toCustomerEntity), totalCount };
  }

  async update(id: string, data: Omit<UpdateCustomerInput, 'id'>): Promise<CustomerEntity> {
    const customer = await this.prisma.customer.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.email !== undefined && data.email !== '' && { email: data.email }),
        ...(data.phone !== undefined && data.phone !== '' && { phone: data.phone }),
        ...(data.addressLine1 && { addressLine1: data.addressLine1 }),
        ...(data.addressLine2 !== undefined && data.addressLine2 !== '' && { addressLine2: data.addressLine2 }),
        ...(data.city && { city: data.city }),
        ...(data.postalCode && { postalCode: data.postalCode }),
        ...(data.country && { country: data.country }),
        ...(data.companyName !== undefined && data.companyName !== '' && { companyName: data.companyName }),
        ...(data.vatNumber !== undefined && data.vatNumber !== '' && { vatNumber: data.vatNumber }),
      },
      include: { vehicles: true },
    });
    return toCustomerEntity(customer);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.customer.delete({ where: { id } });
  }
}
