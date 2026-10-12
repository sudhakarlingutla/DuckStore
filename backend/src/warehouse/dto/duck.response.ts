import type { Color } from '../../common/color.js';
import type { Size } from '../../common/size.js';
import type { Duck } from '../duck.js';

export interface DuckResponse {
  id: number;
  color: Color;
  size: Size;
  price: number;
  quantity: number;
  version: number;
}

export function toDuckResponse(duck: Duck): DuckResponse {
  return {
    id: duck.id,
    color: duck.color,
    size: duck.size,
    price: duck.price.toNumber(),
    quantity: duck.quantity,
    version: duck.version,
  };
}
