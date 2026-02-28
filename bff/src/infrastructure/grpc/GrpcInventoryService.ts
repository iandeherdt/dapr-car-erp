import type { IInventoryService } from '../../application/services/IInventoryService.js';
import * as client from '../../clients/inventory-client.js';

export class GrpcInventoryService implements IInventoryService {
  createPart(data: client.CreatePartRequest, correlationId?: string): Promise<client.Part> {
    return client.createPart(data, correlationId);
  }

  getPart(id: string, correlationId?: string): Promise<client.Part> {
    return client.getPart(id, correlationId);
  }

  listParts(
    pagination: client.Pagination,
    categoryFilter?: string,
    searchQuery?: string,
    correlationId?: string,
  ): Promise<client.ListPartsResponse> {
    return client.listParts(pagination, categoryFilter, searchQuery, correlationId);
  }

  updatePart(data: client.UpdatePartRequest, correlationId?: string): Promise<client.Part> {
    return client.updatePart(data, correlationId);
  }

  checkAvailability(
    items: client.PartQuantity[],
    correlationId?: string,
  ): Promise<client.CheckAvailabilityResponse> {
    return client.checkAvailability(items, correlationId);
  }

  reserveParts(data: client.ReservePartsRequest, correlationId?: string): Promise<client.ReservePartsResponse> {
    return client.reserveParts(data, correlationId);
  }

  releaseParts(data: client.ReleasePartsRequest, correlationId?: string): Promise<client.ReleasePartsResponse> {
    return client.releaseParts(data, correlationId);
  }

  listLowStockParts(pagination: client.Pagination, correlationId?: string): Promise<client.ListPartsResponse> {
    return client.listLowStockParts(pagination, correlationId);
  }
}
