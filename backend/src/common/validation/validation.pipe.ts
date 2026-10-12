import { ValidationPipe } from '@nestjs/common';
import type { ValidationError as FieldError } from 'class-validator';
import { ErrorDetail, ValidationError } from '../errors/domain-error.js';

/**
 * Validates every request body against its DTO. Fields the DTO does not
 * declare are rejected, not silently dropped, so a client that sends
 * something we ignore finds out straight away.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => new ValidationError(toDetails(errors)),
  });
}

function toDetails(errors: FieldError[]): ErrorDetail[] {
  return errors.flatMap((error) =>
    Object.values(error.constraints ?? {}).map((message) => ({
      field: error.property,
      message,
    })),
  );
}
