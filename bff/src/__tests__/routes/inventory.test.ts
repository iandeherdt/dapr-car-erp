import Fastify, { FastifyInstance } from 'fastify';
import { inventoryRoutes } from '../../routes/inventory';
import { schemas } from '../../schemas';
import type { IInventoryService } from '../../application/services/IInventoryService';
import type { Part, ListPartsResponse } from '../../clients/inventory-client';
import { GrpcClientError } from '../../clients/grpc-client';
import * as grpc from '@grpc/grpc-js';

const PART_ID = '44444444-4444-4444-4444-444444444444';

const mockMoney = { amountCents: '1500', currency: 'EUR' };

const mockPart: Part = {
  id: PART_ID,
  sku: 'OIL-FILTER-001',
  name: 'Oil Filter',
  description: 'Standard oil filter',
  category: 'Filters',
  manufacturer: 'Mann-Filter',
  unitPrice: mockMoney,
  costPrice: mockMoney,
  quantityInStock: 24,
  quantityReserved: 3,
  reorderLevel: 5,
  location: 'Shelf A-3',
  compatibleMakes: ['Toyota', 'Honda'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

const mockListResponse: ListPartsResponse = {
  parts: [mockPart],
  pagination: { totalCount: 1, page: 1, pageSize: 20, totalPages: 1 },
};

function buildApp(service: Partial<IInventoryService>): FastifyInstance {
  const app = Fastify({ logger: false, ajv: { customOptions: { strict: false } } });
  for (const schema of schemas) app.addSchema(schema);
  app.register(inventoryRoutes, { prefix: '/api', service: service as IInventoryService });
  return app;
}

describe('Inventory Routes', () => {
  describe('GET /api/parts', () => {
    it('returns 200 with parts list', async () => {
      const service: Partial<IInventoryService> = {
        listParts: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: '/api/parts' });

      expect(res.statusCode).toBe(200);
      expect(res.json().parts).toHaveLength(1);
      expect(res.json().parts[0].sku).toBe('OIL-FILTER-001');
    });

    it('passes category and search filters to service', async () => {
      const service: Partial<IInventoryService> = {
        listParts: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      await app.inject({ method: 'GET', url: '/api/parts?category=Filters&search=oil' });

      expect(service.listParts).toHaveBeenCalledWith(
        { page: 1, pageSize: 20 },
        'Filters',
        'oil',
        undefined,
      );
    });
  });

  describe('GET /api/parts/low-stock', () => {
    it('returns 200 with low-stock parts', async () => {
      const service: Partial<IInventoryService> = {
        listLowStockParts: jest.fn().mockResolvedValue(mockListResponse),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: '/api/parts/low-stock' });

      expect(res.statusCode).toBe(200);
      expect(service.listLowStockParts).toHaveBeenCalledWith({ page: 1, pageSize: 20 }, undefined);
    });
  });

  describe('POST /api/parts', () => {
    it('returns 201 with created part', async () => {
      const service: Partial<IInventoryService> = {
        createPart: jest.fn().mockResolvedValue(mockPart),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'POST',
        url: '/api/parts',
        payload: { sku: 'OIL-FILTER-001', name: 'Oil Filter' },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBe(PART_ID);
    });
  });

  describe('GET /api/parts/:id', () => {
    it('returns 200 with part', async () => {
      const service: Partial<IInventoryService> = {
        getPart: jest.fn().mockResolvedValue(mockPart),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/parts/${PART_ID}` });

      expect(res.statusCode).toBe(200);
      expect(res.json().sku).toBe('OIL-FILTER-001');
    });

    it('returns 404 when part not found', async () => {
      const service: Partial<IInventoryService> = {
        getPart: jest.fn().mockRejectedValue(new GrpcClientError('Not found', grpc.status.NOT_FOUND)),
      };
      const app = buildApp(service);

      const res = await app.inject({ method: 'GET', url: `/api/parts/${PART_ID}` });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PUT /api/parts/:id', () => {
    it('returns 200 with updated part', async () => {
      const service: Partial<IInventoryService> = {
        updatePart: jest.fn().mockResolvedValue({ ...mockPart, name: 'Premium Oil Filter' }),
      };
      const app = buildApp(service);

      const res = await app.inject({
        method: 'PUT',
        url: `/api/parts/${PART_ID}`,
        payload: { name: 'Premium Oil Filter' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe('Premium Oil Filter');
      expect(service.updatePart).toHaveBeenCalledWith(
        expect.objectContaining({ id: PART_ID, name: 'Premium Oil Filter' }),
        undefined,
      );
    });
  });
});
