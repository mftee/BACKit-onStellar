import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isStellarAddress', async: false })
export class IsStellarAddressConstraint implements ValidatorConstraintInterface {
  validate(address: string) {
    // Stellar addresses start with 'G' and are 56 characters long (base32)
    return /^G[A-Z2-7]{55}$/.test(address);
  }

  defaultMessage() {
    return 'Invalid Stellar address format';
  }
}

export function IsStellarAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStellarAddressConstraint,
    });
  };
}
