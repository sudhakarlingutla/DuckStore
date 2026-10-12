import { Money } from '../../common/money.js';
import type { PackageType } from '../packaging/packaging.js';
import type { ShippingMode } from '../shipping-mode.js';
import { priceOrder, type PriceBreakdown } from './pricing-engine.js';
import type { PricedOrder, PricingRule } from './pricing-rule.js';

function order(overrides: Partial<PricedOrder> & { price?: number } = {}) {
  const { price = 10, ...rest } = overrides;
  return {
    unitPrice: Money.fromNumber(price),
    quantity: 10,
    packageType: 'Wood',
    destinationCountry: 'France',
    shippingMode: 'Sea',
    ...rest,
  } satisfies PricedOrder;
}

/** The breakdown as [code, amount, running total] rows, in dollars. */
const rows = (breakdown: PriceBreakdown) =>
  breakdown.lines.map((line) => [
    line.code,
    line.amount.toNumber(),
    line.runningTotal.toNumber(),
  ]);

const codes = (breakdown: PriceBreakdown) =>
  breakdown.lines.map((line) => line.code);

describe('priceOrder', () => {
  describe('worked examples, checked by hand', () => {
    it('10 medium ducks at $10 to France by sea', () => {
      const result = priceOrder(
        order({ quantity: 10, packageType: 'Cardboard' }),
      );

      expect(result.baseCost.toNumber()).toBe(100);
      expect(rows(result)).toEqual([
        ['PACKAGE_CARDBOARD', -1, 99], // 1% of 100.00
        ['DESTINATION_OTHER', 14.85, 113.85], // 15% of 99.00
        ['SHIPPING_SEA', 400, 513.85],
      ]);
      expect(result.total.toNumber()).toBe(513.85);
    });

    it('10 medium ducks at $10 to India by sea', () => {
      const result = priceOrder(
        order({ packageType: 'Cardboard', destinationCountry: 'India' }),
      );

      expect(rows(result)).toEqual([
        ['PACKAGE_CARDBOARD', -1, 99],
        ['DESTINATION_INDIA', 18.81, 117.81], // 19% of 99.00
        ['SHIPPING_SEA', 400, 517.81],
      ]);
    });

    it('10 small ducks at $10 to Bolivia by land', () => {
      const result = priceOrder(
        order({
          packageType: 'Plastic',
          destinationCountry: 'Bolivia',
          shippingMode: 'Land',
        }),
      );

      expect(rows(result)).toEqual([
        ['PACKAGE_PLASTIC', 10, 110], // 10% of 100.00
        ['DESTINATION_BOLIVIA', 14.3, 124.3], // 13% of 110.00
        ['SHIPPING_LAND', 100, 224.3], // 10 x 10 units
      ]);
    });

    it('200 large ducks at $10 to the USA by air: every kind of rule', () => {
      const result = priceOrder(
        order({
          quantity: 200,
          destinationCountry: 'USA',
          shippingMode: 'Air',
        }),
      );

      expect(result.baseCost.toNumber()).toBe(2000);
      expect(rows(result)).toEqual([
        ['VOLUME_DISCOUNT', -400, 1600], // 20% of 2000.00
        ['PACKAGE_WOOD', 80, 1680], // 5% of 1600.00
        ['DESTINATION_USA', 302.4, 1982.4], // 18% of 1680.00
        ['SHIPPING_AIR', 6000, 7982.4], // 30 x 200 units
      ]);
      expect(result.total.toNumber()).toBe(7982.4);
    });
  });

  describe('the volume discount starts above 100 units', () => {
    const largeToUsaByLand = (quantity: number) =>
      priceOrder(
        order({ quantity, destinationCountry: 'USA', shippingMode: 'Land' }),
      );

    it('gives no discount for exactly 100 units', () => {
      const result = largeToUsaByLand(100);

      expect(rows(result)).toEqual([
        ['PACKAGE_WOOD', 50, 1050],
        ['DESTINATION_USA', 189, 1239],
        ['SHIPPING_LAND', 1000, 2239],
      ]);
    });

    it('gives 20% off for 101 units', () => {
      const result = largeToUsaByLand(101);

      expect(rows(result)).toEqual([
        ['VOLUME_DISCOUNT', -202, 808], // 20% of 1010.00
        ['PACKAGE_WOOD', 40.4, 848.4], // 5% of 808.00
        ['DESTINATION_USA', 152.71, 1001.11], // 18% of 848.40 = 152.712
        ['SHIPPING_LAND', 1010, 2011.11],
      ]);
    });
  });

  describe('the air discount starts above 1000 units', () => {
    it('charges the full air rate for exactly 1000 units', () => {
      const result = priceOrder(
        order({
          quantity: 1000,
          destinationCountry: 'USA',
          shippingMode: 'Air',
        }),
      );

      expect(rows(result)).toEqual([
        ['VOLUME_DISCOUNT', -2000, 8000],
        ['PACKAGE_WOOD', 400, 8400],
        ['DESTINATION_USA', 1512, 9912],
        ['SHIPPING_AIR', 30000, 39912],
      ]);
    });

    it('takes 15% off the air charge, not the order, for 1001 units', () => {
      const result = priceOrder(
        order({ quantity: 1001, packageType: 'Plastic', shippingMode: 'Air' }),
      );

      expect(rows(result)).toEqual([
        ['VOLUME_DISCOUNT', -2002, 8008], // 20% of 10010.00
        ['PACKAGE_PLASTIC', 800.8, 8808.8], // 10% of 8008.00
        ['DESTINATION_OTHER', 1321.32, 10130.12], // 15% of 8808.80
        ['SHIPPING_AIR', 30030, 40160.12], // 30 x 1001 units
        ['SHIPPING_AIR_DISCOUNT', -4504.5, 35655.62], // 15% of 30030.00
      ]);
      const airDiscount = result.lines.at(-1)!;
      expect(airDiscount.basis!.toNumber()).toBe(30030);
    });
  });

  describe('shipping charges', () => {
    it('charges sea a flat 400 whatever the quantity', () => {
      const amounts = [1, 500, 5000].map((quantity) =>
        priceOrder(order({ quantity, shippingMode: 'Sea' }))
          .lines.find((line) => line.code === 'SHIPPING_SEA')!
          .amount.toNumber(),
      );

      expect(amounts).toEqual([400, 400, 400]);
    });

    it('does not apply any percentage to the shipping charge', () => {
      const result = priceOrder(order({ shippingMode: 'Land' }));

      expect(codes(result).at(-1)).toBe('SHIPPING_LAND');
    });
  });

  describe('destination', () => {
    it.each([
      ['USA', 'DESTINATION_USA', 18],
      ['usa', 'DESTINATION_USA', 18],
      ['  Usa ', 'DESTINATION_USA', 18],
      ['Bolivia', 'DESTINATION_BOLIVIA', 13],
      ['INDIA', 'DESTINATION_INDIA', 19],
      ['Brazil', 'DESTINATION_OTHER', 15],
      ['United States', 'DESTINATION_OTHER', 15],
    ])('treats "%s" as %s (+%i%%)', (destinationCountry, code, percent) => {
      const result = priceOrder(order({ destinationCountry }));

      const line = result.lines.find((l) => l.code.startsWith('DESTINATION'))!;
      expect(line.code).toBe(code);
      expect(line.percent).toBe(percent);
    });
  });

  describe('rounding', () => {
    it('rounds half a cent up, on each line', () => {
      const result = priceOrder(
        order({ price: 0.5, quantity: 1, packageType: 'Cardboard' }),
      );

      expect(rows(result)).toEqual([
        ['PACKAGE_CARDBOARD', -0.01, 0.49], // 1% of 0.50 = 0.005
        ['DESTINATION_OTHER', 0.07, 0.56], // 15% of 0.49 = 0.0735
        ['SHIPPING_SEA', 400, 400.56],
      ]);
    });

    it('computes the base cost without floating-point drift', () => {
      expect(
        priceOrder(order({ price: 0.1, quantity: 3 })).baseCost.toNumber(),
      ).toBe(0.3);
      expect(
        priceOrder(order({ price: 19.99, quantity: 3 })).baseCost.toNumber(),
      ).toBe(59.97);
    });

    it('stays exact for the largest order the API accepts', () => {
      const result = priceOrder(
        order({
          price: 999_999.99,
          quantity: 1_000_000,
          packageType: 'Plastic',
          destinationCountry: 'India',
          shippingMode: 'Air',
        }),
      );

      // base 999,999,990,000.00 -> -20% -> +10% -> +19%, then air.
      expect(result.baseCost.cents).toBe(99_999_999_000_000);
      expect(rows(result).map(([code, amount]) => [code, amount])).toEqual([
        ['VOLUME_DISCOUNT', -199_999_998_000],
        ['PACKAGE_PLASTIC', 79_999_999_200],
        ['DESTINATION_INDIA', 167_199_998_328],
        ['SHIPPING_AIR', 30_000_000],
        ['SHIPPING_AIR_DISCOUNT', -4_500_000],
      ]);
      expect(result.total.toNumber()).toBe(1_047_225_489_528);
    });
  });

  describe('for every combination of package, destination, mode and size of order', () => {
    const packages: PackageType[] = ['Wood', 'Cardboard', 'Plastic'];
    const countries = ['USA', 'Bolivia', 'India', 'France'];
    const modes: ShippingMode[] = ['Land', 'Air', 'Sea'];
    const quantities = [1, 100, 101, 1000, 1001];
    const prices = [0.01, 0.5, 19.99, 999_999.99];

    const combinations = packages.flatMap((packageType) =>
      countries.flatMap((destinationCountry) =>
        modes.flatMap((shippingMode) =>
          quantities.flatMap((quantity) =>
            prices.map((price) =>
              order({
                packageType,
                destinationCountry,
                shippingMode,
                quantity,
                price,
              }),
            ),
          ),
        ),
      ),
    );
    const results = combinations.map((input) => ({
      input,
      result: priceOrder(input),
    }));

    it('the base cost plus every line equals the total', () => {
      for (const { result } of results) {
        const sum = result.lines.reduce(
          (total, line) => total + line.amount.cents,
          result.baseCost.cents,
        );
        expect(sum).toBe(result.total.cents);
      }
    });

    it('each running total is the previous one plus the line amount', () => {
      for (const { result } of results) {
        let previous = result.baseCost.cents;
        for (const line of result.lines) {
          expect(line.runningTotal.cents).toBe(previous + line.amount.cents);
          previous = line.runningTotal.cents;
        }
      }
    });

    it('lines come in the order volume, package, destination, shipping', () => {
      const stage = (code: string) =>
        ['VOLUME', 'PACKAGE', 'DESTINATION', 'SHIPPING'].findIndex((prefix) =>
          code.startsWith(prefix),
        );

      for (const { result } of results) {
        const stages = codes(result).map(stage);
        expect(stages).toEqual([...stages].sort((a, b) => a - b));
        expect(stages).not.toContain(-1);
      }
    });

    it('a rule that does not apply leaves no line', () => {
      for (const { input, result } of results) {
        expect(codes(result).includes('VOLUME_DISCOUNT')).toBe(
          input.quantity > 100,
        );
        expect(codes(result).includes('SHIPPING_AIR_DISCOUNT')).toBe(
          input.shippingMode === 'Air' && input.quantity > 1000,
        );
        expect(
          codes(result).filter((code) => code.startsWith('PACKAGE')),
        ).toEqual([`PACKAGE_${input.packageType.toUpperCase()}`]);
        expect(
          codes(result).filter((code) => code.startsWith('DESTINATION')),
        ).toHaveLength(1);
      }
    });

    it('every percentage line is that percentage of its basis', () => {
      for (const { result } of results) {
        for (const line of result.lines.filter((l) => l.percent)) {
          expect(Math.abs(line.amount.cents)).toBe(
            line.basis!.percent(line.percent!).cents,
          );
        }
      }
    });
  });

  describe('the rule list', () => {
    it('can be extended without touching the engine or other rules', () => {
      const flatFee: PricingRule = () => [
        {
          code: 'HANDLING',
          description: 'Handling',
          amount: Money.fromNumber(5),
        },
      ];
      const halfOff: PricingRule = (_, totalSoFar) => [
        {
          code: 'HALF_OFF',
          description: 'Half off',
          amount: totalSoFar.percent(50).negated(),
        },
      ];

      const result = priceOrder(order({ quantity: 1 }), [flatFee, halfOff]);

      // 10.00 + 5.00 = 15.00, then half off the running total.
      expect(rows(result)).toEqual([
        ['HANDLING', 5, 15],
        ['HALF_OFF', -7.5, 7.5],
      ]);
    });
  });
});
