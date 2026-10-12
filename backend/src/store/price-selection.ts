import type { Duck } from '../warehouse/duck.js';
import type { OrderRequest } from './order.js';
import { InsufficientStockError, NoMatchingDuckError } from './store-errors.js';

/**
 * Decides which warehouse record an order is priced from.
 *
 * An order names a color and size but no price, and the warehouse may hold
 * that color and size at several prices. The policy:
 *
 *   1. Only records that can cover the whole quantity qualify. An order is
 *      never split across records, because the brief's rules assume one
 *      unit price per order.
 *   2. Of those, the cheapest wins: the customer gets the best price that
 *      can actually be fulfilled.
 *
 * `candidates` are the active ducks of the ordered color and size.
 */
export function selectDuckForOrder(
  candidates: Duck[],
  order: Pick<OrderRequest, 'color' | 'size' | 'quantity'>,
): Duck {
  if (candidates.length === 0) {
    throw new NoMatchingDuckError(order.color, order.size);
  }

  const cheapestFirst = candidates
    .filter((duck) => duck.quantity >= order.quantity)
    .sort((a, b) => a.price.cents - b.price.cents);

  if (cheapestFirst.length === 0) {
    throw new InsufficientStockError(order.color, order.size, order.quantity);
  }
  return cheapestFirst[0];
}
