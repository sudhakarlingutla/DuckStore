import type { Color } from '../common/color.js';
import type { Size } from '../common/size.js';
import type { Duck } from './duck.js';

/**
 * The only thing other modules may ask of the warehouse: a read-only view of
 * the stock for a color and size. The store depends on this interface, not
 * on the repository, so it cannot write to the warehouse and does not care
 * how the stock is stored.
 */
export interface StockReader {
  findActiveByColorAndSize(color: Color, size: Size): Promise<Duck[]>;
}

export const STOCK_READER = Symbol('STOCK_READER');
