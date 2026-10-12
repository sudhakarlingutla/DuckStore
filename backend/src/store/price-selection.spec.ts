import { Money } from '../common/money.js';
import type { Duck } from '../warehouse/duck.js';
import { selectDuckForOrder } from './price-selection.js';
import { InsufficientStockError, NoMatchingDuckError } from './store-errors.js';

let nextId = 1;
const duck = (price: number, quantity: number): Duck => ({
  id: nextId++,
  color: 'Red',
  size: 'Large',
  price: Money.fromNumber(price),
  quantity,
  version: 1,
});

const orderOf = (quantity: number) =>
  ({ color: 'Red', size: 'Large', quantity }) as const;

describe('selectDuckForOrder', () => {
  it('uses the only duck there is when it has enough stock', () => {
    const only = duck(10, 50);

    expect(selectDuckForOrder([only], orderOf(20))).toBe(only);
  });

  it('picks the cheapest of several ducks that all have enough stock', () => {
    const dear = duck(12, 500);
    const cheap = duck(8, 500);
    const middle = duck(10, 500);

    expect(selectDuckForOrder([dear, cheap, middle], orderOf(100))).toBe(cheap);
  });

  it('skips a cheaper duck that cannot cover the order', () => {
    const cheapButShort = duck(8, 30);
    const dearWithStock = duck(12, 500);

    expect(
      selectDuckForOrder([cheapButShort, dearWithStock], orderOf(100)),
    ).toBe(dearWithStock);
  });

  it('accepts an order for exactly the stock on hand', () => {
    const exact = duck(10, 100);

    expect(selectDuckForOrder([exact], orderOf(100))).toBe(exact);
  });

  it('does not combine records to cover an order', () => {
    expect(() =>
      selectDuckForOrder([duck(8, 60), duck(12, 60)], orderOf(100)),
    ).toThrow(InsufficientStockError);
  });

  it('reports insufficient stock when the only duck is out of stock', () => {
    expect(() => selectDuckForOrder([duck(10, 0)], orderOf(1))).toThrow(
      InsufficientStockError,
    );
  });

  it('reports no matching duck when there is none of that color and size', () => {
    expect(() => selectDuckForOrder([], orderOf(1))).toThrow(
      NoMatchingDuckError,
    );
  });

  it('leaves the list it was given in its original order', () => {
    const candidates = [duck(12, 500), duck(8, 500)];
    const before = [...candidates];

    selectDuckForOrder(candidates, orderOf(1));

    expect(candidates).toEqual(before);
  });
});
