import type {
  Part,
  ListPartsResponse,
  CheckAvailabilityResponse,
  ReservePartsResponse,
  ReleasePartsResponse,
  CreatePartRequest,
  UpdatePartRequest,
  ReservePartsRequest,
  ReleasePartsRequest,
  PartQuantity,
  Pagination,
} from '../../clients/inventory-client.js';

export interface IInventoryService {
  createPart(data: CreatePartRequest, correlationId?: string): Promise<Part>;
  getPart(id: string, correlationId?: string): Promise<Part>;
  listParts(
    pagination: Pagination,
    categoryFilter?: string,
    searchQuery?: string,
    correlationId?: string,
  ): Promise<ListPartsResponse>;
  updatePart(data: UpdatePartRequest, correlationId?: string): Promise<Part>;
  checkAvailability(items: PartQuantity[], correlationId?: string): Promise<CheckAvailabilityResponse>;
  reserveParts(data: ReservePartsRequest, correlationId?: string): Promise<ReservePartsResponse>;
  releaseParts(data: ReleasePartsRequest, correlationId?: string): Promise<ReleasePartsResponse>;
  listLowStockParts(pagination: Pagination, correlationId?: string): Promise<ListPartsResponse>;
}
