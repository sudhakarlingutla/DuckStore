import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storedDucks, storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('POST /api/orders/price', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const order = {
    color: 'Red',
    size: 'Large',
    quantity: 200,
    destinationCountry: 'USA',
    shippingMode: 'Air',
  };
  const priceOrder = (body: object) =>
    request(app.getHttpServer()).post('/api/orders/price').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    pool = createTestPool();
  });

  beforeEach(async () => {
    await clearDucks(pool);
  });

  afterAll(async () => {
    await pool.end();
    await app.close();
  });

  describe('an order the warehouse can fulfil', () => {
    it('returns packaging, the total and every discount and increment', async () => {
      const duckId = await storeDuck(pool, { price: '10.00', quantity: 5000 });

      const response = await priceOrder(order).expect(200);

      expect(response.body).toEqual({
        packageType: 'Wood',
        protectionTypes: ['Polystyrene balls'],
        duckId,
        unitPrice: 10,
        quantity: 200,
        baseCost: 2000,
        breakdown: [
          {
            code: 'VOLUME_DISCOUNT',
            description: 'Over 100 units: 20% discount',
            rate: 0.2,
            basis: 2000,
            amount: -400,
            runningTotal: 1600,
          },
          {
            code: 'PACKAGE_WOOD',
            description: 'Wood package: +5%',
            rate: 0.05,
            basis: 1600,
            amount: 80,
            runningTotal: 1680,
          },
          {
            code: 'DESTINATION_USA',
            description: 'Destination USA: +18%',
            rate: 0.18,
            basis: 1680,
            amount: 302.4,
            runningTotal: 1982.4,
          },
          {
            code: 'SHIPPING_AIR',
            description: 'Air shipment: 30 USD x 200 units',
            amount: 6000,
            runningTotal: 7982.4,
          },
        ],
        total: 7982.4,
        currency: 'USD',
      });
    });

    it('packs small ducks going by sea in plastic with beads and bubble wrap', async () => {
      await storeDuck(pool, { size: 'XSmall', price: '2.50', quantity: 100 });

      const response = await priceOrder({
        ...order,
        size: 'XSmall',
        quantity: 10,
        destinationCountry: 'Peru',
        shippingMode: 'Sea',
      }).expect(200);

      expect(response.body).toMatchObject({
        packageType: 'Plastic',
        protectionTypes: ['Moisture-absorbing beads', 'Bubble-wrap bags'],
        baseCost: 25,
        // 25.00 +10% = 27.50, +15% = 31.63 (31.625 rounds up), +400
        total: 431.63,
      });
    });

    it('prices from the cheapest record that has enough stock', async () => {
      await storeDuck(pool, { price: '8.00', quantity: 50 });
      const chosen = await storeDuck(pool, { price: '9.00', quantity: 300 });
      await storeDuck(pool, { price: '12.00', quantity: 900 });

      const response = await priceOrder(order).expect(200);

      expect(response.body).toMatchObject({ duckId: chosen, unitPrice: 9 });
    });

    it('ignores ducks of another color or size', async () => {
      await storeDuck(pool, { color: 'Black', price: '1.00', quantity: 900 });
      await storeDuck(pool, { size: 'Small', price: '1.00', quantity: 900 });
      const chosen = await storeDuck(pool, { price: '10.00', quantity: 900 });

      const response = await priceOrder(order).expect(200);

      expect(response.body.duckId).toBe(chosen);
    });

    it('changes nothing in the warehouse, however often it is asked', async () => {
      await storeDuck(pool, { price: '10.00', quantity: 5000 });
      const before = await storedDucks(pool);

      const first = await priceOrder(order).expect(200);
      const second = await priceOrder(order).expect(200);
      await Promise.all(Array.from({ length: 20 }, () => priceOrder(order)));

      expect(second.body).toEqual(first.body);
      expect(await storedDucks(pool)).toEqual(before);
    });
  });

  describe('an order the warehouse cannot fulfil', () => {
    it('answers 404 when there is no duck of that color and size', async () => {
      await storeDuck(pool, { color: 'Green' });

      const response = await priceOrder(order).expect(404);

      expect(response.body).toMatchObject({
        code: 'NO_MATCHING_DUCK',
        message: 'The warehouse has no Red Large duck.',
      });
    });

    it('answers 404 when the only such duck is deleted', async () => {
      await storeDuck(pool, { quantity: 5000, deleted: true });

      const response = await priceOrder(order).expect(404);

      expect(response.body.code).toBe('NO_MATCHING_DUCK');
    });

    it('never prices from a deleted duck, even a cheaper one', async () => {
      await storeDuck(pool, { price: '1.00', quantity: 5000, deleted: true });
      const active = await storeDuck(pool, { price: '10.00', quantity: 5000 });

      const response = await priceOrder(order).expect(200);

      expect(response.body.duckId).toBe(active);
    });

    it('answers 422 when no record has enough stock', async () => {
      await storeDuck(pool, { price: '10.00', quantity: 199 });

      const response = await priceOrder(order).expect(422);

      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    });

    it('answers 422 when stock is enough only across several records', async () => {
      await storeDuck(pool, { price: '8.00', quantity: 120 });
      await storeDuck(pool, { price: '9.00', quantity: 120 });

      const response = await priceOrder(order).expect(422);

      expect(response.body.code).toBe('INSUFFICIENT_STOCK');
    });
  });

  describe('an invalid order', () => {
    const without = (field: keyof typeof order) => {
      const { [field]: _omitted, ...rest } = order;
      return rest;
    };

    it.each([
      ['no color', without('color'), 'color'],
      ['no size', without('size'), 'size'],
      ['no quantity', without('quantity'), 'quantity'],
      ['no destination', without('destinationCountry'), 'destinationCountry'],
      ['no shipping mode', without('shippingMode'), 'shippingMode'],
      ['an unknown color', { ...order, color: 'Pink' }, 'color'],
      ['an unknown size', { ...order, size: 'Tiny' }, 'size'],
      [
        'an unknown shipping mode',
        { ...order, shippingMode: 'Rail' },
        'shippingMode',
      ],
      [
        'a shipping mode in the wrong case',
        { ...order, shippingMode: 'air' },
        'shippingMode',
      ],
      ['a quantity of zero', { ...order, quantity: 0 }, 'quantity'],
      ['a negative quantity', { ...order, quantity: -5 }, 'quantity'],
      ['a fractional quantity', { ...order, quantity: 100.5 }, 'quantity'],
      [
        'a quantity above the maximum',
        { ...order, quantity: 1_000_001 },
        'quantity',
      ],
      [
        'an empty destination',
        { ...order, destinationCountry: '' },
        'destinationCountry',
      ],
      [
        'a blank destination',
        { ...order, destinationCountry: '   ' },
        'destinationCountry',
      ],
      [
        'a destination that is not text',
        { ...order, destinationCountry: 42 },
        'destinationCountry',
      ],
      ['a price chosen by the caller', { ...order, price: 0.01 }, 'price'],
    ])('rejects %s', async (_, body, field) => {
      await storeDuck(pool, { quantity: 5000 });

      const response = await priceOrder(body).expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(
        response.body.details.map((d: { field: string }) => d.field),
      ).toContain(field);
    });
  });
});
