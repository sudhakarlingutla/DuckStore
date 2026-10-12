import { Money } from '../../../common/money.js';
import type { ShippingMode } from '../../shipping-mode.js';
import {
  percentDiscount,
  type Charge,
  type PricedOrder,
  type PricingRule,
} from '../pricing-rule.js';

const SEA_FLAT_CHARGE = Money.fromNumber(400);
const LAND_CHARGE_PER_UNIT = Money.fromNumber(10);
const AIR_CHARGE_PER_UNIT = Money.fromNumber(30);
const AIR_DISCOUNT_UNITS_THRESHOLD = 1000;
const AIR_DISCOUNT_PERCENT = 15;

/** Sea: a flat 400 USD, whatever the quantity. */
function seaCharges(): Charge[] {
  return [
    {
      code: 'SHIPPING_SEA',
      description: 'Sea shipment: 400 USD',
      amount: SEA_FLAT_CHARGE,
    },
  ];
}

/** Land: 10 USD per unit. */
function landCharges(order: PricedOrder): Charge[] {
  return [
    {
      code: 'SHIPPING_LAND',
      description: `Land shipment: 10 USD x ${order.quantity} units`,
      amount: LAND_CHARGE_PER_UNIT.times(order.quantity),
    },
  ];
}

/**
 * Air: 30 USD per unit. Over 1000 units the air charge itself is reduced by
 * 15%, shown as its own line so the breakdown lists every discount. The
 * discount is a percentage of the air charge, not of the order total.
 */
function airCharges(order: PricedOrder): Charge[] {
  const airCharge = AIR_CHARGE_PER_UNIT.times(order.quantity);
  const charges: Charge[] = [
    {
      code: 'SHIPPING_AIR',
      description: `Air shipment: 30 USD x ${order.quantity} units`,
      amount: airCharge,
    },
  ];
  if (order.quantity > AIR_DISCOUNT_UNITS_THRESHOLD) {
    charges.push(
      percentDiscount(
        'SHIPPING_AIR_DISCOUNT',
        `Over ${AIR_DISCOUNT_UNITS_THRESHOLD} units by air: ${AIR_DISCOUNT_PERCENT}% off the air charge`,
        AIR_DISCOUNT_PERCENT,
        airCharge,
      ),
    );
  }
  return charges;
}

const CHARGES_FOR_MODE: Record<ShippingMode, (order: PricedOrder) => Charge[]> =
  {
    Sea: seaCharges,
    Land: landCharges,
    Air: airCharges,
  };

/** Shipping is a flat or per-unit amount, added after all percentages. */
export const shippingRule: PricingRule = (order) =>
  CHARGES_FOR_MODE[order.shippingMode](order);
