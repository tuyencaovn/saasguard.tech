import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Password complexity requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character (!@#$%^&*(),.?":{}|<>)
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!value || typeof value !== 'string') return false;

          const minLength = value.length >= 8;
          const hasUppercase = /[A-Z]/.test(value);
          const hasLowercase = /[a-z]/.test(value);
          const hasNumber = /\d/.test(value);
          const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);

          return minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
        },
        defaultMessage(args: ValidationArguments) {
          const value = args.value as string;
          if (!value) return 'Password is required';

          const errors: string[] = [];
          if (value.length < 8) errors.push('at least 8 characters');
          if (!/[A-Z]/.test(value)) errors.push('1 uppercase letter');
          if (!/[a-z]/.test(value)) errors.push('1 lowercase letter');
          if (!/\d/.test(value)) errors.push('1 number');
          if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errors.push('1 special character');

          return `Password must contain: ${errors.join(', ')}`;
        },
      },
    });
  };
}
