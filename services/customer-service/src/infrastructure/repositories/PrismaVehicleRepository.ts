import { PrismaClient, Vehicle } from '@prisma/client';
import { IVehicleRepository } from '../../domain/repositories/IVehicleRepository.js';
import { VehicleEntity, CreateVehicleInput, UpdateVehicleInput } from '../../domain/entities/Vehicle.js';

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

export class PrismaVehicleRepository implements IVehicleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateVehicleInput): Promise<VehicleEntity> {
    const vehicle = await this.prisma.vehicle.create({
      data: {
        customerId: data.customerId,
        make: data.make,
        model: data.model,
        year: data.year,
        vin: data.vin || null,
        licensePlate: data.licensePlate || null,
        mileageKm: data.mileageKm ?? 0,
        color: data.color || null,
        engineType: data.engineType || null,
      },
    });
    return toVehicleEntity(vehicle);
  }

  async findById(id: string): Promise<VehicleEntity | null> {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    return vehicle ? toVehicleEntity(vehicle) : null;
  }

  async findByCustomerId(customerId: string): Promise<VehicleEntity[]> {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { customerId },
      orderBy: { createdAt: 'asc' },
    });
    return vehicles.map(toVehicleEntity);
  }

  async update(id: string, data: Omit<UpdateVehicleInput, 'id'>): Promise<VehicleEntity> {
    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.make && { make: data.make }),
        ...(data.model && { model: data.model }),
        ...(data.year && { year: data.year }),
        ...(data.vin !== undefined && data.vin !== '' && { vin: data.vin }),
        ...(data.licensePlate !== undefined && data.licensePlate !== '' && { licensePlate: data.licensePlate }),
        ...(data.mileageKm !== undefined && data.mileageKm !== 0 && { mileageKm: data.mileageKm }),
        ...(data.color !== undefined && data.color !== '' && { color: data.color }),
        ...(data.engineType !== undefined && data.engineType !== '' && { engineType: data.engineType }),
      },
    });
    return toVehicleEntity(vehicle);
  }
}
