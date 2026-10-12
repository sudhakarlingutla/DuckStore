import {
  NotFoundError,
  UnprocessableError,
} from '../common/errors/domain-error.js';

export class NoMatchingDuckError extends NotFoundError {
  constructor(color: string, size: string) {
    super('NO_MATCHING_DUCK', `The warehouse has no ${color} ${size} duck.`);
  }
}

export class InsufficientStockError extends UnprocessableError {
  constructor(color: string, size: string, quantity: number) {
    super(
      'INSUFFICIENT_STOCK',
      `No ${color} ${size} duck record has ${quantity} units in stock.`,
    );
  }
}
