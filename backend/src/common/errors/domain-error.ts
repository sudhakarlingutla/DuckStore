export interface ErrorDetail {
  field: string;
  message: string;
}

/**
 * A failure the caller can understand and act on. The business code throws
 * these and knows nothing about HTTP; the exception filter decides the status.
 */
export abstract class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** The request is malformed or breaks a field rule. */
export class ValidationError extends DomainError {
  constructor(details: ErrorDetail[], message = 'The request is not valid.') {
    super('VALIDATION_ERROR', message, details);
  }
}

/** The thing the request refers to does not exist. */
export class NotFoundError extends DomainError {}

/** The request is valid but clashes with the current state of the data. */
export class ConflictError extends DomainError {}

/** The request is valid but cannot be fulfilled. */
export class UnprocessableError extends DomainError {}
