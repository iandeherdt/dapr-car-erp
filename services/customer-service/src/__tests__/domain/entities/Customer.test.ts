import { validateCreateCustomer } from '../../../domain/entities/Customer.js';

describe('validateCreateCustomer', () => {
  const valid = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Brussels',
    postalCode: '1000',
  };

  it('passes with valid input', () => {
    expect(() => validateCreateCustomer(valid)).not.toThrow();
  });

  it('throws when firstName is empty', () => {
    expect(() => validateCreateCustomer({ ...valid, firstName: '' })).toThrow('firstName is required');
  });

  it('throws when lastName is empty', () => {
    expect(() => validateCreateCustomer({ ...valid, lastName: '' })).toThrow('lastName is required');
  });

  it('throws when addressLine1 is empty', () => {
    expect(() => validateCreateCustomer({ ...valid, addressLine1: '' })).toThrow('addressLine1 is required');
  });

  it('throws when city is empty', () => {
    expect(() => validateCreateCustomer({ ...valid, city: '' })).toThrow('city is required');
  });

  it('throws when postalCode is empty', () => {
    expect(() => validateCreateCustomer({ ...valid, postalCode: '' })).toThrow('postalCode is required');
  });
});
