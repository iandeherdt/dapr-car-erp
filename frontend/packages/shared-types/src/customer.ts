export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  companyName: string;
  vatNumber: string;
  vehicles: Vehicle[];
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  mileageKm: number;
  color: string;
  engineType: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  companyName: string;
  vatNumber: string;
}

export interface UpdateCustomerInput {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  companyName: string;
  vatNumber: string;
}

export interface AddVehicleInput {
  customerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  licensePlate: string;
  mileageKm: number;
  color: string;
  engineType: string;
}
