import type { Color } from '../common/color.js';
import type { Size } from '../common/size.js';
import type { Duck } from '../warehouse/duck.js';
import type { Packaging } from './packaging/packaging.js';
import type { PriceBreakdown } from './pricing/pricing-engine.js';
import type { ShippingMode } from './shipping-mode.js';

/** What a customer asks for. It carries no price. */
export interface OrderRequest {
  color: Color;
  size: Size;
  quantity: number;
  destinationCountry: string;
  shippingMode: ShippingMode;
}

/** How the order would be packed and what it would cost. */
export interface OrderQuote {
  /** The warehouse record the unit price was taken from. */
  duck: Duck;
  quantity: number;
  packaging: Packaging;
  price: PriceBreakdown;
}

export const MAX_ORDER_QUANTITY = 1_000_000;
