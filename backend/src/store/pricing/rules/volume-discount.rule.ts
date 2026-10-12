import { percentDiscount, type PricingRule } from '../pricing-rule.js';

const UNITS_THRESHOLD = 100;
const DISCOUNT_PERCENT = 20;

/** More than 100 units: 20% off. Exactly 100 units gets no discount. */
export const volumeDiscountRule: PricingRule = (order, totalSoFar) =>
  order.quantity > UNITS_THRESHOLD
    ? [
        percentDiscount(
          'VOLUME_DISCOUNT',
          `Over ${UNITS_THRESHOLD} units: ${DISCOUNT_PERCENT}% discount`,
          DISCOUNT_PERCENT,
          totalSoFar,
        ),
      ]
    : [];
