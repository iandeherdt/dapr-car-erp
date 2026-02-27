import type { Money } from './common';

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

export interface CreatePartInput {
  sku: string;
  name: string;
  description: string;
  category: string;
  manufacturer: string;
  unitPrice: Money;
  costPrice: Money;
  quantityInStock: number;
  reorderLevel: number;
  location: string;
  compatibleMakes: string[];
}
