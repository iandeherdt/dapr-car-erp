import { Customer } from '../../../domain/entities/Customer.js';
import { ValidationError } from '../../../domain/errors.js';

describe('Customer.validate', () => {
  const valid = {
    firstName: 'John',
    lastName: 'Doe',
    addressLine1: '123 Main St',
    city: 'Brussels',
    postalCode: '1000',
  };

  it('passes with valid input', () => {
    expect(() => Customer.validate(valid)).not.toThrow();
  });

  it('throws ValidationError when firstName is empty', () => {
    expect(() => Customer.validate({ ...valid, firstName: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when lastName is empty', () => {
    expect(() => Customer.validate({ ...valid, lastName: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when addressLine1 is empty', () => {
    expect(() => Customer.validate({ ...valid, addressLine1: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when city is empty', () => {
    expect(() => Customer.validate({ ...valid, city: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when postalCode is empty', () => {
    expect(() => Customer.validate({ ...valid, postalCode: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when email is malformed', () => {
    expect(() => Customer.validate({ ...valid, email: 'not-an-email' })).toThrow(ValidationError);
  });

  it('passes when email is a valid address', () => {
    expect(() => Customer.validate({ ...valid, email: 'john@example.com' })).not.toThrow();
  });

  it('passes when email is omitted', () => {
    expect(() => Customer.validate({ ...valid, email: undefined })).not.toThrow();
  });
});
