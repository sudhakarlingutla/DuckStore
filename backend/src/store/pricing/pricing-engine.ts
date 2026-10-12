import type { Money } from '../../common/money.js';
import type { Charge, PricedOrder, PricingRule } from './pricing-rule.js';
import { destinationRule } from './rules/destination.rule.js';
import { packageRule } from './rules/package.rule.js';
import { shippingRule } from './rules/shipping.rule.js';
import { volumeDiscountRule } from './rules/volume-discount.rule.js';

/** A charge together with the total after it was applied. */
export interface BreakdownLine extends Charge {
  runningTotal: Money;
}

export interface PriceBreakdown {
  /** quantity x unit price, before any rule. */
  baseCost: Money;
  lines: BreakdownLine[];
  total: Money;
}

/**
 * The rules, in the order the brief lists them. The order matters: each
 * percentage is taken of the running total, that is, the base cost with
 * every earlier rule already applied. The brief can also be read as "every
 * percentage is of the base cost"; see the README for why this reading was
 * chosen. Shipping comes last, so shipping charges are never themselves
 * subject to a percentage.
 */
export const PRICING_RULES: readonly PricingRule[] = [
  volumeDiscountRule,
  packageRule,
  destinationRule,
  shippingRule,
];

/**
 * Prices an order by passing a running total through each rule in turn
 * (a pipeline of rules). Supporting a new rule means writing it and adding
 * it to the list; this function and the existing rules stay as they are.
 */
export function priceOrder(
  order: PricedOrder,
  rules: readonly PricingRule[] = PRICING_RULES,
): PriceBreakdown {
  const baseCost = order.unitPrice.times(order.quantity);
  const lines: BreakdownLine[] = [];
  let total = baseCost;

  for (const rule of rules) {
    for (const charge of rule(order, total)) {
      total = total.plus(charge.amount);
      lines.push({ ...charge, runningTotal: total });
    }
  }

  return { baseCost, lines, total };
}
