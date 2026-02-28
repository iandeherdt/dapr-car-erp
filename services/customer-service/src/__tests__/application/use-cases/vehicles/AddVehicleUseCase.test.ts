import { AddVehicleUseCase } from '../../../../application/use-cases/vehicles/AddVehicleUseCase.js';
import { ICustomerRepository } from '../../../../domain/repositories/ICustomerRepository.js';
import { IVehicleRepository } from '../../../../domain/repositories/IVehicleRepository.js';
import { NotFoundError } from '../../../../domain/errors.js';
import { CustomerEntity } from '../../../../domain/entities/Customer.js';
import { VehicleEntity } from '../../../../domain/entities/Vehicle.js';

describe('AddVehicleUseCase', () => {
  let mockCustomerRepo: jest.Mocked<ICustomerRepository>;
  let mockVehicleRepo: jest.Mocked<IVehicleRepository>;
  let useCase: AddVehicleUseCase;

  const mockCustomer: CustomerEntity = {
    id: 'cust-1', firstName: 'John', lastName: 'Doe', email: null, phone: null,
    addressLine1: '123 Main', addressLine2: null, city: 'Brussels', postalCode: '1000',
    country: 'Belgium', companyName: null, vatNumber: null,
    createdAt: new Date(), updatedAt: new Date(), vehicles: [],
  };

  const mockVehicle: VehicleEntity = {
    id: 'veh-1', customerId: 'cust-1', make: 'BMW', model: '3 Series',
    year: 2020, vin: null, licensePlate: null, mileageKm: 0,
    color: null, engineType: null, createdAt: new Date(), updatedAt: new Date(),
  };

  beforeEach(() => {
    mockCustomerRepo = { create: jest.fn(), findById: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() };
    mockVehicleRepo = { create: jest.fn(), findById: jest.fn(), findByCustomerId: jest.fn(), update: jest.fn() };
    useCase = new AddVehicleUseCase(mockCustomerRepo, mockVehicleRepo);
  });

  it('creates vehicle when customer exists', async () => {
    mockCustomerRepo.findById.mockResolvedValue(mockCustomer);
    mockVehicleRepo.create.mockResolvedValue(mockVehicle);

    const result = await useCase.execute({ customerId: 'cust-1', make: 'BMW', model: '3 Series', year: 2020 });

    expect(mockCustomerRepo.findById).toHaveBeenCalledWith('cust-1');
    expect(mockVehicleRepo.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockVehicle);
  });

  it('throws NotFoundError when customer does not exist', async () => {
    mockCustomerRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute({ customerId: 'missing', make: 'BMW', model: '3 Series', year: 2020 }))
      .rejects.toThrow(NotFoundError);
    expect(mockVehicleRepo.create).not.toHaveBeenCalled();
  });
});
