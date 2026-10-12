import type { Color } from '../common/color.js';
import type { Money } from '../common/money.js';
import type { Size } from '../common/size.js';

/** An active (not deleted) stock record. */
export interface Duck {
  id: number;
  color: Color;
  size: Size;
  price: Money;
  quantity: number;
  /** Goes up by one on every write. An edit must quote the version it saw. */
  version: number;
}

/** Stock arriving at the warehouse. */
export interface IncomingStock {
  color: Color;
  size: Size;
  price: Money;
  quantity: number;
}

export const MAX_PRICE = 999_999.99;
export const MAX_QUANTITY_PER_REQUEST = 1_000_000;
