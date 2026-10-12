import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from '../common/errors/domain-error.js';

export class DuckNotFoundError extends NotFoundError {
  constructor(id: number) {
    super('DUCK_NOT_FOUND', `There is no duck with id ${id}.`);
  }
}

export class StaleVersionError extends ConflictError {
  constructor() {
    super(
      'STALE_VERSION',
      'This duck was changed by someone else. Reload and try again.',
    );
  }
}

export class DuckPriceConflictError extends ConflictError {
  constructor() {
    super(
      'DUCK_PRICE_CONFLICT',
      'Another duck with this color and size already has that price.',
    );
  }
}

export class StockLimitExceededError extends UnprocessableError {
  constructor() {
    super(
      'STOCK_LIMIT_EXCEEDED',
      'Adding this quantity would exceed the most stock one duck record can hold.',
    );
  }
}
