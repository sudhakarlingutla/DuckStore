import type { OrderQuote } from '../order.js';
import type { PackageType, ProtectionType } from '../packaging/packaging.js';
import type { BreakdownLine } from '../pricing/pricing-engine.js';

export interface BreakdownLineResponse {
  code: string;
  description: string;
  /** Percentage lines only: the rate as a fraction (0.2 for 20%). */
  rate?: number;
  /** Percentage lines only: the amount the rate was applied to. */
  basis?: number;
  /** Negative for a discount, positive for an increment. */
  amount: number;
  /** The total after this line. */
  runningTotal: number;
}

export interface OrderQuoteResponse {
  packageType: PackageType;
  protectionTypes: ProtectionType[];
  duckId: number;
  unitPrice: number;
  quantity: number;
  /** quantity x unitPrice. baseCost plus every breakdown amount is total. */
  baseCost: number;
  breakdown: BreakdownLineResponse[];
  total: number;
  currency: 'USD';
}

export function toOrderQuoteResponse(quote: OrderQuote): OrderQuoteResponse {
  return {
    packageType: quote.packaging.packageType,
    protectionTypes: quote.packaging.protectionTypes,
    duckId: quote.duck.id,
    unitPrice: quote.duck.price.toNumber(),
    quantity: quote.quantity,
    baseCost: quote.price.baseCost.toNumber(),
    breakdown: quote.price.lines.map(toLineResponse),
    total: quote.price.total.toNumber(),
    currency: 'USD',
  };
}

function toLineResponse(line: BreakdownLine): BreakdownLineResponse {
  return {
    code: line.code,
    description: line.description,
    ...(line.percent !== undefined && { rate: line.percent / 100 }),
    ...(line.basis !== undefined && { basis: line.basis.toNumber() }),
    amount: line.amount.toNumber(),
    runningTotal: line.runningTotal.toNumber(),
  };
}
