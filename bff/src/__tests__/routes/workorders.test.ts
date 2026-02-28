import Fastify, { FastifyInstance } from 'fastify';
import { workOrderRoutes } from '../../routes/workorders';
import { schemas } from '../../schemas';
import type { IWorkOrderService } from '../../application/services/IWorkOrderService';
import type { ICustomerService } from '../../application/services/ICustomerService';
import type { WorkOrder, ListWorkOrdersResponse } from '../../clients/workorder-client';
import type { Customer, Vehicle } from '../../clients/customer-client';
import { GrpcClientError } from '../../clients/grpc-client';
import * as grpc from '@grpc/grpc-js';

const WO_ID   = '33333333-3333-3333-3333-333333333333';
const CUST_ID = '11111111-1111-1111-1111-111111111111';
const VEH_ID  = '22222222-2222-2222-2222-222222222222';
const PART_ID = '44444444-4444-4444-4444-444444444444';
const LI_ID   = '55555555-5555-5555-5555-555555555555';

const mockMoney = { amountCents: '10000', currency: 'EUR' };

const mockWorkOrder: WorkOrder = {
  id: WO_ID,
  customerId: CUST_ID,
  vehicleId: VEH_ID,
  description: 'Annual service',
  status: 'WORK_ORDER_STATUS_DRAFT',
  lineItems: [],
  laborEntries: [],
  estimatedTotal: mockMoney,
  actualTotal: mockMoney,
  assignedMechanic: 'Pieter',
  notes: '',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  completedAt: '',
};

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

const mockListResponse: ListWorkOrdersResponse = {
  workOrders: [mockWorkOrder],
  pagination: { totalCount: 1, page: 1, pageSize: 20, totalPages: 1 },
};

function buildApp(
  workOrderService: Partial<IWorkOrderService>,
  customerService: Partial<ICustomerService> = {},
): FastifyInstance {
  const app = Fastify({ logger: false, ajv: { customOptions: { strict: false } } });
  for (const schema of schemas) app.addSchema(schema);
  app.register(workOrderRoutes, {
    prefix: '/api',
    workOrderService: workOrderService as IWorkOrderService,
    customerService: customerService as ICustomerService,
  });
  return app;
}

describe('WorkOrder Routes', () => {
  describe('GET /api/work-orders', () => {
    it('returns 200 with normalized status', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        listWorkOrders: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({ method: 'GET', url: '/api/work-orders' });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.workOrders).toHaveLength(1);
      expect(body.workOrders[0].status).toBe('draft'); // normalized from WORK_ORDER_STATUS_DRAFT
    });

    it('passes pagination and customerId filter to service', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        listWorkOrders: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(workOrderService);

      await app.inject({ method: 'GET', url: `/api/work-orders?page=2&pageSize=10&customerId=${CUST_ID}` });

      expect(workOrderService.listWorkOrders).toHaveBeenCalledWith(
        { page: 2, pageSize: 10 },
        undefined,
        CUST_ID,
        undefined,
      );
    });
  });

  describe('POST /api/work-orders', () => {
    it('returns 201 with created work order', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        createWorkOrder: jest.fn().mockResolvedValue(mockWorkOrder),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({
        method: 'POST',
        url: '/api/work-orders',
        payload: { customerId: CUST_ID, vehicleId: VEH_ID, description: 'Annual service' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBe(WO_ID);
    });
  });

  describe('GET /api/work-orders/:id', () => {
    it('returns 200 with aggregated work order (customer + vehicle)', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        getWorkOrder: jest.fn().mockResolvedValue(mockWorkOrder),
      };
      const customerService: Partial<ICustomerService> = {
        getCustomer: jest.fn().mockResolvedValue(mockCustomer),
        getVehicle: jest.fn().mockResolvedValue(mockVehicle),
      };
      const app = buildApp(workOrderService, customerService);

      const res = await app.inject({ method: 'GET', url: `/api/work-orders/${WO_ID}` });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(WO_ID);
      expect(body.status).toBe('draft');
      expect(body.customer.id).toBe(CUST_ID);
      expect(body.vehicle.id).toBe(VEH_ID);
    });

    it('returns 404 when work order is not found', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        getWorkOrder: jest.fn().mockRejectedValue(new GrpcClientError('Not found', grpc.status.NOT_FOUND)),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({ method: 'GET', url: `/api/work-orders/${WO_ID}` });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/work-orders/:id/status', () => {
    it('returns 200 and calls service with normalized status value', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        updateWorkOrderStatus: jest.fn().mockResolvedValue({
          ...mockWorkOrder,
          status: 'WORK_ORDER_STATUS_IN_PROGRESS',
        }),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/work-orders/${WO_ID}/status`,
        payload: { status: 'in_progress' }, // route schema accepts normalized values
      });

      expect(res.statusCode).toBe(200);
      expect(workOrderService.updateWorkOrderStatus).toHaveBeenCalledWith(
        { id: WO_ID, newStatus: 'in_progress' },
        undefined,
      );
    });
  });

  describe('POST /api/work-orders/:id/line-items', () => {
    it('returns 201 with updated work order', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        addLineItem: jest.fn().mockResolvedValue(mockWorkOrder),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({
        method: 'POST',
        url: `/api/work-orders/${WO_ID}/line-items`,
        payload: { partId: PART_ID, quantity: 2 },
      });

      expect(res.statusCode).toBe(201);
      expect(workOrderService.addLineItem).toHaveBeenCalledWith(
        { workOrderId: WO_ID, partId: PART_ID, quantity: 2 },
        undefined,
      );
    });
  });

  describe('DELETE /api/work-orders/:id/line-items/:lid', () => {
    it('returns 200 with updated work order', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        removeLineItem: jest.fn().mockResolvedValue(mockWorkOrder),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/work-orders/${WO_ID}/line-items/${LI_ID}`,
      });

      expect(res.statusCode).toBe(200);
      expect(workOrderService.removeLineItem).toHaveBeenCalledWith(
        { workOrderId: WO_ID, lineItemId: LI_ID },
        undefined,
      );
    });
  });

  describe('POST /api/work-orders/:id/labor', () => {
    it('returns 201 with updated work order', async () => {
      const workOrderService: Partial<IWorkOrderService> = {
        addLaborEntry: jest.fn().mockResolvedValue(mockWorkOrder),
      };
      const app = buildApp(workOrderService);

      const res = await app.inject({
        method: 'POST',
        url: `/api/work-orders/${WO_ID}/labor`,
        payload: { description: 'Oil change', hours: 2, hourlyRate: mockMoney },
      });

      expect(res.statusCode).toBe(201);
    });
  });
});
