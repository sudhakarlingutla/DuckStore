const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** True when the number is finite and has no more than two decimal places. */
export function hasAtMostTwoDecimals(value: number): boolean {
  if (!Number.isFinite(value)) {
    return false;
  }
  const cents = value * 100;
  return Math.abs(cents - Math.round(cents)) < 1e-6;
}

/**
 * An amount of US dollars held as a whole number of cents.
 *
 * Every calculation is integer arithmetic, so results are exact to the cent
 * and never pick up floating-point drift (0.1 + 0.2 style errors). The
 * largest order the API accepts stays far below Number.MAX_SAFE_INTEGER.
 */
export class Money {
  private constructor(readonly cents: number) {}

  static readonly ZERO = new Money(0);

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new RangeError(`Not a whole number of cents: ${cents}`);
    }
    return new Money(cents);
  }

  /** From a JSON number such as 19.99. Rejects more than two decimals. */
  static fromNumber(amount: number): Money {
    if (!hasAtMostTwoDecimals(amount)) {
      throw new RangeError(`Not a valid amount of money: ${amount}`);
    }
    return Money.fromCents(Math.round(amount * 100));
  }

  /** From a DECIMAL column value such as "19.99", without using a float. */
  static fromDecimalString(text: string): Money {
    const match = DECIMAL_PATTERN.exec(text);
    if (!match) {
      throw new RangeError(`Not a valid amount of money: "${text}"`);
    }
    const [, sign, dollars, fraction = ''] = match;
    const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
    return Money.fromCents(sign === '-' ? -cents : cents);
  }

  plus(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  minus(other: Money): Money {
    return Money.fromCents(this.cents - other.cents);
  }

  negated(): Money {
    return Money.fromCents(-this.cents);
  }

  times(quantity: number): Money {
    if (!Number.isInteger(quantity)) {
      throw new RangeError(`Quantity must be a whole number: ${quantity}`);
    }
    return Money.fromCents(this.cents * quantity);
  }

  /**
   * The given whole-number percentage of this amount, rounded half-up to the
   * cent (0.5 of a cent rounds up).
   */
  percent(percentage: number): Money {
    if (!Number.isInteger(percentage) || percentage < 0) {
      throw new RangeError(`Unsupported percentage: ${percentage}`);
    }
    if (this.cents < 0) {
      throw new RangeError('Cannot take a percentage of a negative amount');
    }
    return Money.fromCents(Math.floor((this.cents * percentage + 50) / 100));
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }

  /** For JSON responses, e.g. 7982.4. */
  toNumber(): number {
    return this.cents / 100;
  }

  /** For DECIMAL columns, e.g. "7982.40". */
  toDecimalString(): string {
    const sign = this.cents < 0 ? '-' : '';
    const absolute = Math.abs(this.cents);
    const dollars = Math.floor(absolute / 100);
    const fraction = String(absolute % 100).padStart(2, '0');
    return `${sign}${dollars}.${fraction}`;
  }
}
