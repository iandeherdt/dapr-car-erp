import Fastify, { FastifyInstance } from 'fastify';
import { customerRoutes } from '../../routes/customers';
import { schemas } from '../../schemas';
import type { ICustomerService } from '../../application/services/ICustomerService';
import type { Customer, Vehicle, ListCustomersResponse } from '../../clients/customer-client';
import { GrpcClientError } from '../../clients/grpc-client';
import * as grpc from '@grpc/grpc-js';

const CUST_ID = '11111111-1111-1111-1111-111111111111';
const VEH_ID  = '22222222-2222-2222-2222-222222222222';

const mockCustomer: Customer = {
  id: CUST_ID,
  firstName: 'Jan',
  lastName: 'Janssen',
  email: 'jan@example.com',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: '',
  companyName: '',
  vatNumber: '',
  vehicles: [],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockVehicle: Vehicle = {
  id: VEH_ID,
  customerId: CUST_ID,
  make: 'Toyota',
  model: 'Corolla',
  year: 2020,
  vin: '',
  licensePlate: '1-ABC-123',
  mileageKm: 45000,
  color: 'Silver',
  engineType: 'gasoline',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockListResponse: ListCustomersResponse = {
  customers: [mockCustomer],
  pagination: { totalCount: 1, page: 1, pageSize: 20, totalPages: 1 },
};

function buildApp(service: Partial<ICustomerService>): FastifyInstance {
  const app = Fastify({ logger: false, ajv: { customOptions: { strict: false } } });
  for (const schema of schemas) app.addSchema(schema);
  app.register(customerRoutes, { prefix: '/api', service: service as ICustomerService });
  return app;
}

describe('Customer Routes', () => {
  describe('GET /api/customers', () => {
    it('returns 200 with customer list', async () => {
      const service: Partial<ICustomerService> = {
        listCustomers: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: '/api/customers' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.customers).toHaveLength(1);
      expect(body.customers[0].email).toBe('jan@example.com');
      expect(service.listCustomers).toHaveBeenCalledWith({ page: 1, pageSize: 20 }, undefined, undefined);
    });

    it('passes search query and pagination to service', async () => {
      const service: Partial<ICustomerService> = {
        listCustomers: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      await app.inject({ method: 'GET', url: '/api/customers?page=2&pageSize=5&search=jan' });

      expect(service.listCustomers).toHaveBeenCalledWith({ page: 2, pageSize: 5 }, 'jan', undefined);
    });
  });

  describe('POST /api/customers', () => {
    it('returns 201 with created customer', async () => {
      const service: Partial<ICustomerService> = {
        createCustomer: jest.fn().mockResolvedValue(mockCustomer),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'POST',
        url: '/api/customers',
        payload: { firstName: 'Jan', lastName: 'Janssen', email: 'jan@example.com' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBe(CUST_ID);
    });
  });

  describe('GET /api/customers/:id', () => {
    it('returns 200 with customer', async () => {
      const service: Partial<ICustomerService> = {
        getCustomer: jest.fn().mockResolvedValue(mockCustomer),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/customers/${CUST_ID}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().id).toBe(CUST_ID);
      expect(service.getCustomer).toHaveBeenCalledWith(CUST_ID, undefined);
    });

    it('returns 404 when service throws GrpcClientError NOT_FOUND', async () => {
      const service: Partial<ICustomerService> = {
        getCustomer: jest.fn().mockRejectedValue(new GrpcClientError('Not found', grpc.status.NOT_FOUND)),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/customers/${CUST_ID}` });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe('Not found');
    });
  });

  describe('PUT /api/customers/:id', () => {
    it('returns 200 with updated customer', async () => {
      const service: Partial<ICustomerService> = {
        updateCustomer: jest.fn().mockResolvedValue({ ...mockCustomer, firstName: 'Piet' }),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/customers/${CUST_ID}`,
        payload: { firstName: 'Piet', lastName: 'Janssen', email: 'jan@example.com' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().firstName).toBe('Piet');
    });
  });

  describe('DELETE /api/customers/:id', () => {
    it('returns 204 on success', async () => {
      const service: Partial<ICustomerService> = {
        deleteCustomer: jest.fn().mockResolvedValue({ success: true }),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'DELETE', url: `/api/customers/${CUST_ID}` });

      expect(res.statusCode).toBe(204);
    });
  });

  describe('POST /api/customers/:id/vehicles', () => {
    it('returns 201 with created vehicle', async () => {
      const service: Partial<ICustomerService> = {
        addVehicle: jest.fn().mockResolvedValue(mockVehicle),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'POST',
        url: `/api/customers/${CUST_ID}/vehicles`,
        payload: { make: 'Toyota', model: 'Corolla', year: 2020 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().make).toBe('Toyota');
      expect(service.addVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ customerId: CUST_ID, make: 'Toyota' }),
        undefined,
      );
    });
  });

  describe('PUT /api/customers/:id/vehicles/:vid', () => {
    it('returns 200 with updated vehicle', async () => {
      const service: Partial<ICustomerService> = {
        updateVehicle: jest.fn().mockResolvedValue({ ...mockVehicle, mileageKm: 50000 }),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/customers/${CUST_ID}/vehicles/${VEH_ID}`,
        payload: { make: 'Toyota', model: 'Corolla', year: 2020, mileageKm: 50000 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().mileageKm).toBe(50000);
    });
  });
});
