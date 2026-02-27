import { createServiceClient } from './grpc-client.js';

const PROTO_PATH = 'inventory/v1/inventory.proto';
const PACKAGE_NAME = 'inventory.v1';
const SERVICE_NAME = 'InventoryService';
const DAPR_APP_ID = 'inventory-service';

function getClient() {
  return createServiceClient(PROTO_PATH, PACKAGE_NAME, SERVICE_NAME, DAPR_APP_ID);
}

// ---- Type definitions ----

export interface Money {
  amountCents: string;
  currency: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
}

export interface PaginationResult {
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Part {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  unitPrice: Money;
  costPrice: Money;
  quantityInStock: number;
  quantityReserved: number;
  reorderLevel: number;
  location: string;
  compatibleMakes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ListPartsResponse {
  parts: Part[];
  pagination: PaginationResult;
}

export interface PartQuantity {
  partId: string;
  quantity: number;
}

export interface PartAvailability {
  partId: string;
  requested: number;
  available: number;
  isAvailable: boolean;
}

export interface CheckAvailabilityResponse {
  allAvailable: boolean;
  availability: PartAvailability[];
}

export interface ReservePartsResponse {
  success: boolean;
  reservationId: string;
  errorMessage: string;
}

export interface ReleasePartsResponse {
  success: boolean;
}

// ---- Request shapes ----

export interface CreatePartRequest {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  manufacturer?: string;
  unitPrice?: Money;
  costPrice?: Money;
  initialStock?: number;
  reorderLevel?: number;
  location?: string;
  compatibleMakes?: string[];
}

export interface UpdatePartRequest {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  unitPrice?: Money;
  costPrice?: Money;
  reorderLevel?: number;
  location?: string;
}

export interface ReservePartsRequest {
  workOrderId: string;
  items: PartQuantity[];
}

export interface ReleasePartsRequest {
  reservationId: string;
  workOrderId: string;
}

// ---- Client methods ----

export async function createPart(data: CreatePartRequest, correlationId?: string): Promise<Part> {
  return getClient().call<CreatePartRequest, Part>('createPart', data, 10_000, correlationId);
}

export async function getPart(id: string, correlationId?: string): Promise<Part> {
  return getClient().call<{ id: string }, Part>('getPart', { id }, 10_000, correlationId);
}

export async function listParts(
  pagination: Pagination,
  categoryFilter?: string,
  searchQuery?: string,
  correlationId?: string,
): Promise<ListPartsResponse> {
  return getClient().call<object, ListPartsResponse>('listParts', {
    pagination,
    categoryFilter: categoryFilter ?? '',
    searchQuery: searchQuery ?? '',
  }, 10_000, correlationId);
}

export async function updatePart(data: UpdatePartRequest, correlationId?: string): Promise<Part> {
  return getClient().call<UpdatePartRequest, Part>('updatePart', data, 10_000, correlationId);
}

export async function checkAvailability(
  items: PartQuantity[],
  correlationId?: string,
): Promise<CheckAvailabilityResponse> {
  return getClient().call<{ items: PartQuantity[] }, CheckAvailabilityResponse>(
    'checkAvailability',
    { items },
    10_000,
    correlationId,
  );
}

export async function reserveParts(data: ReservePartsRequest, correlationId?: string): Promise<ReservePartsResponse> {
  return getClient().call<ReservePartsRequest, ReservePartsResponse>('reserveParts', data, 10_000, correlationId);
}

export async function releaseParts(data: ReleasePartsRequest, correlationId?: string): Promise<ReleasePartsResponse> {
  return getClient().call<ReleasePartsRequest, ReleasePartsResponse>('releaseParts', data, 10_000, correlationId);
}

export async function listLowStockParts(pagination: Pagination, correlationId?: string): Promise<ListPartsResponse> {
  return getClient().call<{ pagination: Pagination }, ListPartsResponse>('listLowStockParts', {
    pagination,
  }, 10_000, correlationId);
}
