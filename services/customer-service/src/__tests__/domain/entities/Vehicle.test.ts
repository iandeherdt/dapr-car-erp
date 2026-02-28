import { Vehicle } from '../../../domain/entities/Vehicle.js';
import { ValidationError } from '../../../domain/errors.js';

describe('Vehicle.validate', () => {
  const currentYear = new Date().getFullYear();
  const valid = { customerId: 'c-1', make: 'Toyota', model: 'Corolla', year: 2020 };

  it('passes with valid input', () => {
    expect(() => Vehicle.validate(valid)).not.toThrow();
  });

  it('throws ValidationError when make is empty', () => {
    expect(() => Vehicle.validate({ ...valid, make: '' })).toThrow(ValidationError);
  });

  it('throws ValidationError when model is empty', () => {
    expect(() => Vehicle.validate({ ...valid, model: '   ' })).toThrow(ValidationError);
  });

  it('throws ValidationError when year is before 1886', () => {
    expect(() => Vehicle.validate({ ...valid, year: 1885 })).toThrow(ValidationError);
  });

  it('throws ValidationError when year is in the future beyond next year', () => {
    expect(() => Vehicle.validate({ ...valid, year: currentYear + 2 })).toThrow(ValidationError);
  });

  it('passes for next model year', () => {
    expect(() => Vehicle.validate({ ...valid, year: currentYear + 1 })).not.toThrow();
  });
});
