/**
 * Shared JSON Schema definitions registered on the Fastify instance.
 * Referenced in route schemas via { $ref: '<$id>#' }.
 *
 * NOTE: additionalProperties is intentionally omitted (defaults to true) so
 * fast-json-stringify passes through any extra fields returned by gRPC services.
 */

export const schemas: object[] = [
  // ── Primitives ────────────────────────────────────────────────────────────

  {
    $id: 'Money',
    type: 'object',
    description: 'Monetary amount stored as integer cents',
    properties: {
      // proto3 int64 is serialised as a string by the gRPC-JSON layer
      amountCents: { type: 'string', description: 'Amount in cents, e.g. "1000" = €10.00', example: '1000' },
      currency: { type: 'string', description: 'ISO 4217 currency code', example: 'EUR' },
    },
  },

  {
    $id: 'PaginationResult',
    type: 'object',
    properties: {
      totalCount: { type: 'integer', description: 'Total number of matching records' },
      page: { type: 'integer', description: 'Current page (1-based)' },
      pageSize: { type: 'integer', description: 'Records per page' },
      totalPages: { type: 'integer', description: 'Total number of pages' },
    },
  },

  {
    $id: 'ApiError',
    type: 'object',
    properties: {
      error: { type: 'string', description: 'Human-readable error description' },
      code: { type: 'integer', description: 'gRPC status code if the error originated from a service' },
    },
  },

  // ── Customer domain ────────────────────────────────────────────────────────

  {
    $id: 'Vehicle',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      customerId: { type: 'string', format: 'uuid' },
      make: { type: 'string', example: 'Toyota' },
      model: { type: 'string', example: 'Corolla' },
      year: { type: 'integer', example: 2020 },
      vin: { type: 'string', example: '1HGBH41JXMN109186' },
      licensePlate: { type: 'string', example: '1-ABC-123' },
      mileageKm: { type: 'integer', example: 45000 },
      color: { type: 'string', example: 'Silver' },
      engineType: {
        type: 'string',
        enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid'],
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  {
    $id: 'Customer',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      firstName: { type: 'string', example: 'Jan' },
      lastName: { type: 'string', example: 'Janssen' },
      email: { type: 'string', format: 'email', example: 'jan.janssen@example.com' },
      phone: { type: 'string', example: '+32 475 12 34 56' },
      addressLine1: { type: 'string', example: 'Antwerpsestraat 42' },
      addressLine2: { type: 'string' },
      city: { type: 'string', example: 'Ghent' },
      postalCode: { type: 'string', example: '9000' },
      country: { type: 'string', example: 'Belgium' },
      companyName: { type: 'string' },
      vatNumber: { type: 'string', example: 'BE0123456789' },
      vehicles: { type: 'array', items: { $ref: 'Vehicle#' } },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  {
    $id: 'ListCustomersResponse',
    type: 'object',
    properties: {
      customers: { type: 'array', items: { $ref: 'Customer#' } },
      pagination: { $ref: 'PaginationResult#' },
    },
  },

  // ── Work Order domain ──────────────────────────────────────────────────────

  {
    $id: 'WorkOrderLineItem',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workOrderId: { type: 'string', format: 'uuid' },
      partId: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      partSku: { type: 'string' },
      quantity: { type: 'integer', example: 2 },
      unitPrice: { $ref: 'Money#' },
      total: { $ref: 'Money#' },
    },
  },

  {
    $id: 'LaborEntry',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      workOrderId: { type: 'string', format: 'uuid' },
      description: { type: 'string', example: 'Oil change' },
      technicianName: { type: 'string', example: 'Pieter De Smedt' },
      hoursWorked: { type: 'number', example: 2.5 },
      hourlyRate: { $ref: 'Money#' },
      total: { $ref: 'Money#' },
    },
  },

  {
    $id: 'WorkOrder',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      customerId: { type: 'string', format: 'uuid' },
      vehicleId: { type: 'string', format: 'uuid' },
      description: { type: 'string', example: 'Annual service + brake inspection' },
      status: {
        type: 'string',
        enum: ['draft', 'pending', 'in_progress', 'awaiting_parts', 'completed', 'cancelled', 'invoiced'],
        description: 'Normalized lowercase status string',
      },
      lineItems: { type: 'array', items: { $ref: 'WorkOrderLineItem#' } },
      laborEntries: { type: 'array', items: { $ref: 'LaborEntry#' } },
      estimatedTotal: { $ref: 'Money#' },
      actualTotal: { $ref: 'Money#' },
      assignedMechanic: { type: 'string', example: 'Pieter De Smedt' },
      notes: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
      completedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  },

  {
    $id: 'WorkOrderAggregated',
    type: 'object',
    description: 'Work order with embedded customer and vehicle details (fetched in parallel)',
    allOf: [
      { $ref: 'WorkOrder#' },
      {
        type: 'object',
        properties: {
          customer: { $ref: 'Customer#' },
          vehicle: { $ref: 'Vehicle#' },
        },
      },
    ],
  },

  {
    $id: 'ListWorkOrdersResponse',
    type: 'object',
    properties: {
      workOrders: { type: 'array', items: { $ref: 'WorkOrder#' } },
      pagination: { $ref: 'PaginationResult#' },
    },
  },

  // ── Inventory domain ───────────────────────────────────────────────────────

  {
    $id: 'Part',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      sku: { type: 'string', example: 'OIL-FILTER-001' },
      name: { type: 'string', example: 'Oil Filter' },
      description: { type: 'string' },
      category: { type: 'string', example: 'Filters' },
      manufacturer: { type: 'string', example: 'Mann-Filter' },
      unitPrice: { $ref: 'Money#' },
      costPrice: { $ref: 'Money#' },
      quantityInStock: { type: 'integer', example: 24 },
      quantityReserved: { type: 'integer', example: 3 },
      reorderLevel: { type: 'integer', example: 5 },
      location: { type: 'string', example: 'Shelf A-3' },
      compatibleMakes: {
        type: 'array',
        items: { type: 'string' },
        example: ['Toyota', 'Honda'],
      },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  {
    $id: 'ListPartsResponse',
    type: 'object',
    properties: {
      parts: { type: 'array', items: { $ref: 'Part#' } },
      pagination: { $ref: 'PaginationResult#' },
    },
  },

  // ── Billing domain ─────────────────────────────────────────────────────────

  {
    $id: 'InvoiceLineItem',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      description: { type: 'string' },
      quantity: { type: 'integer', example: 1 },
      unitPrice: { $ref: 'Money#' },
      total: { $ref: 'Money#' },
      lineType: {
        type: 'string',
        enum: ['part', 'labor'],
        description: 'Whether this line item is for a part or labour',
      },
    },
  },

  {
    $id: 'Invoice',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      invoiceNumber: { type: 'string', example: 'INV-2024-001' },
      workOrderId: { type: 'string', format: 'uuid' },
      customerId: { type: 'string', format: 'uuid' },
      status: {
        type: 'string',
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      },
      lineItems: { type: 'array', items: { $ref: 'InvoiceLineItem#' } },
      subtotal: { $ref: 'Money#' },
      taxAmount: { $ref: 'Money#' },
      taxRate: { type: 'number', example: 0.21, description: 'Tax rate as decimal (0.21 = 21%)' },
      total: { $ref: 'Money#' },
      issuedAt: { type: 'string', format: 'date-time' },
      dueAt: { type: 'string', format: 'date-time' },
      paidAt: { type: 'string', format: 'date-time', nullable: true },
      notes: { type: 'string' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },

  {
    $id: 'ListInvoicesResponse',
    type: 'object',
    properties: {
      invoices: { type: 'array', items: { $ref: 'Invoice#' } },
      pagination: { $ref: 'PaginationResult#' },
    },
  },

  // ── Dashboard ──────────────────────────────────────────────────────────────

  {
    $id: 'DashboardStats',
    type: 'object',
    properties: {
      recentWorkOrders: {
        type: 'array',
        items: { $ref: 'WorkOrder#' },
        description: 'Up to 5 most recently created work orders',
      },
      activeWorkOrderCount: {
        type: 'integer',
        description: 'Number of work orders currently in progress',
      },
      lowStockCount: {
        type: 'integer',
        description: 'Number of parts at or below their reorder level',
      },
      pendingInvoiceCount: {
        type: 'integer',
        description: 'Number of sent invoices awaiting payment',
      },
    },
  },
];
