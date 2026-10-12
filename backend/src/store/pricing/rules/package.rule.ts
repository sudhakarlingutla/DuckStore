import type { PackageType } from '../../packaging/packaging.js';
import {
  percentDiscount,
  percentIncrease,
  type PricingRule,
} from '../pricing-rule.js';

/** Wood adds 5%, plastic adds 10%, cardboard takes 1% off. */
const PACKAGE_RULES: Record<PackageType, PricingRule> = {
  Wood: (_, totalSoFar) => [
    percentIncrease('PACKAGE_WOOD', 'Wood package: +5%', 5, totalSoFar),
  ],
  Plastic: (_, totalSoFar) => [
    percentIncrease('PACKAGE_PLASTIC', 'Plastic package: +10%', 10, totalSoFar),
  ],
  Cardboard: (_, totalSoFar) => [
    percentDiscount(
      'PACKAGE_CARDBOARD',
      'Cardboard package: 1% discount',
      1,
      totalSoFar,
    ),
  ],
};

export const packageRule: PricingRule = (order, totalSoFar) =>
  PACKAGE_RULES[order.packageType](order, totalSoFar);
