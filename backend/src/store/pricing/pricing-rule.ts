import type { Money } from '../../common/money.js';
import type { PackageType } from '../packaging/packaging.js';
import type { ShippingMode } from '../shipping-mode.js';

/** Everything the price of an order depends on. */
export interface PricedOrder {
  unitPrice: Money;
  quantity: number;
  packageType: PackageType;
  destinationCountry: string;
  shippingMode: ShippingMode;
}

/** One discount (negative amount) or increment (positive amount). */
export interface Charge {
  code: string;
  description: string;
  amount: Money;
  /** For percentage charges: the percentage and the amount it was taken of. */
  percent?: number;
  basis?: Money;
}

/**
 * A pricing rule looks at the order and at the total so far, and returns the
 * charges it applies: none when the rule does not apply to this order.
 *
 * Rules do not know about each other. The engine decides the order they run
 * in and keeps the running total.
 */
export type PricingRule = (order: PricedOrder, totalSoFar: Money) => Charge[];

export function percentIncrease(
  code: string,
  description: string,
  percent: number,
  basis: Money,
): Charge {
  return { code, description, percent, basis, amount: basis.percent(percent) };
}

export function percentDiscount(
  code: string,
  description: string,
  percent: number,
  basis: Money,
): Charge {
  return {
    code,
    description,
    percent,
    basis,
    amount: basis.percent(percent).negated(),
  };
}
