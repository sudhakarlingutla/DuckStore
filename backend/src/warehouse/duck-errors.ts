import { UnprocessableError } from '../common/errors/domain-error.js';

export class StockLimitExceededError extends UnprocessableError {
  constructor() {
    super(
      'STOCK_LIMIT_EXCEEDED',
      'Adding this quantity would exceed the most stock one duck record can hold.',
    );
  }
}
