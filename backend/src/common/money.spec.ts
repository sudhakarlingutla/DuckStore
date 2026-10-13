import { hasAtMostTwoDecimals, Money } from './money.js';

describe('Money', () => {
  describe('reading amounts', () => {
    it.each([
      [19.99, 1999],
      [0.1, 10],
      [200, 20000],
      [999999.99, 99999999],
    ])('reads the number %s as %i cents', (amount, cents) => {
      expect(Money.fromNumber(amount).cents).toBe(cents);
    });

    it.each([1.005, 0.001, NaN, Infinity])(
      'rejects %s, which is not a whole number of cents',
      (amount) => {
        expect(() => Money.fromNumber(amount)).toThrow(RangeError);
      },
    );

    it.each([
      ['200.00', 20000],
      ['10', 1000],
      ['10.5', 1050],
      ['0.05', 5],
      ['-3.20', -320],
    ])('reads the decimal string "%s" as %i cents', (text, cents) => {
      expect(Money.fromDecimalString(text).cents).toBe(cents);
    });

    it.each(['', 'abc', '1.234', '1,00'])(
      'rejects the decimal string "%s"',
      (text) => {
        expect(() => Money.fromDecimalString(text)).toThrow(RangeError);
      },
    );
  });

  describe('arithmetic', () => {
    // In floating point 0.1 * 3 is 0.30000000000000004.
    it('multiplies without floating-point drift', () => {
      expect(Money.fromNumber(0.1).times(3).toNumber()).toBe(0.3);
      expect(Money.fromNumber(19.99).times(3).toNumber()).toBe(59.97);
    });

    it('stays exact at the largest order the API accepts', () => {
      const total = Money.fromNumber(999999.99).times(1_000_000);

      expect(total.cents).toBe(99_999_999_000_000);
      expect(total.percent(20).cents).toBe(19_999_999_800_000);
    });

    it('adds and negates', () => {
      const ten = Money.fromNumber(10);
      const three = Money.fromNumber(3);

      expect(ten.plus(three).toNumber()).toBe(13);
      expect(three.negated().toNumber()).toBe(-3);
    });
  });

  describe('percentages', () => {
    it('rounds half a cent up', () => {
      // 1% of 0.50 is 0.005
      expect(Money.fromNumber(0.5).percent(1).toNumber()).toBe(0.01);
    });

    it('rounds below half a cent down', () => {
      // 18% of 848.40 is 152.712
      expect(Money.fromNumber(848.4).percent(18).toNumber()).toBe(152.71);
      // 1% of 0.49 is 0.0049
      expect(Money.fromNumber(0.49).percent(1).toNumber()).toBe(0);
    });

    it('rejects a fractional percentage', () => {
      expect(() => Money.fromNumber(10).percent(2.5)).toThrow(RangeError);
    });
  });

  describe('formatting', () => {
    it.each([
      [798240, '7982.40'],
      [5, '0.05'],
      [0, '0.00'],
      [-320, '-3.20'],
    ])('writes %i cents as the decimal string "%s"', (cents, text) => {
      expect(Money.fromCents(cents).toDecimalString()).toBe(text);
    });
  });
});

describe('hasAtMostTwoDecimals', () => {
  it.each([0, 5, 0.1, 19.99, 999999.99])('accepts %s', (value) => {
    expect(hasAtMostTwoDecimals(value)).toBe(true);
  });

  it.each([0.001, 19.999, NaN, Infinity])('rejects %s', (value) => {
    expect(hasAtMostTwoDecimals(value)).toBe(false);
  });
});
