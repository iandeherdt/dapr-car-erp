// ─── Customers remote ─────────────────────────────────────────────────────────

declare module 'customers/pages/CustomerList' {
  const Component: React.ComponentType;
  export default Component;
}

declare module 'customers/pages/CustomerDetail' {
  const Component: React.ComponentType<{ id: string }>;
  export default Component;
}

declare module 'customers/pages/NewCustomer' {
  const Component: React.ComponentType;
  export default Component;
}

// ─── Work Orders remote ───────────────────────────────────────────────────────

declare module 'workorders/pages/WorkOrderList' {
  const Component: React.ComponentType;
  export default Component;
}

declare module 'workorders/pages/WorkOrderDetail' {
  const Component: React.ComponentType<{ id: string }>;
  export default Component;
}

declare module 'workorders/pages/NewWorkOrder' {
  const Component: React.ComponentType;
  export default Component;
}

// ─── Inventory remote ─────────────────────────────────────────────────────────

declare module 'inventory/pages/InventoryList' {
  const Component: React.ComponentType;
  export default Component;
}

declare module 'inventory/pages/InventoryDetail' {
  const Component: React.ComponentType<{ id: string }>;
  export default Component;
}

// ─── Billing remote ───────────────────────────────────────────────────────────

declare module 'billing/pages/InvoiceList' {
  const Component: React.ComponentType;
  export default Component;
}

declare module 'billing/pages/InvoiceDetail' {
  const Component: React.ComponentType<{ id: string }>;
  export default Component;
}
