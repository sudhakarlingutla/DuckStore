import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storedDucks, storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('POST /api/ducks', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const redLarge = { color: 'Red', size: 'Large', price: 10, quantity: 5 };
  const addDuck = (body: object) =>
    request(app.getHttpServer()).post('/api/ducks').send(body);

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

  describe('a duck the warehouse does not have yet', () => {
    it('is created and returned with status 201', async () => {
      const response = await addDuck(redLarge).expect(201);

      expect(response.body).toEqual({
        id: expect.any(Number),
        color: 'Red',
        size: 'Large',
        price: 10,
        quantity: 5,
        version: 1,
      });
      expect(await storedDucks(pool)).toEqual([
        {
          id: response.body.id,
          color: 'Red',
          size: 'Large',
          price: '10.00',
          quantity: 5,
          deleted: false,
          version: 1,
        },
      ]);
    });

    it.each([
      ['price', { price: 10.01 }],
      ['color', { color: 'Green' }],
      ['size', { size: 'XLarge' }],
    ])('is a separate record when only the %s differs', async (_, change) => {
      const first = await addDuck(redLarge).expect(201);
      const second = await addDuck({ ...redLarge, ...change }).expect(201);

      expect(second.body.id).not.toBe(first.body.id);
      expect(await storedDucks(pool)).toHaveLength(2);
    });
  });

  describe('a duck with the same color, size and price as an existing one', () => {
    it('is merged: same record, quantities added, status 200', async () => {
      const first = await addDuck(redLarge).expect(201);
      const second = await addDuck({ ...redLarge, quantity: 7 }).expect(200);

      expect(second.body).toEqual({
        ...first.body,
        quantity: 12,
        version: 2,
      });
      expect(await storedDucks(pool)).toHaveLength(1);
    });

    it('is merged however the price is written', async () => {
      await addDuck({ ...redLarge, price: 10 }).expect(201);
      await addDuck({ ...redLarge, price: 10.0 }).expect(200);
      await addDuck({ ...redLarge, price: 10.0 }).expect(200);

      const rows = await storedDucks(pool);
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(15);
    });

    it('is refused when the record cannot hold that much stock', async () => {
      const largestStorable = 4_294_967_295;
      await storeDuck(pool, { quantity: largestStorable });

      const response = await addDuck({ ...redLarge, quantity: 1 }).expect(422);

      expect(response.body.code).toBe('STOCK_LIMIT_EXCEEDED');
      expect((await storedDucks(pool))[0].quantity).toBe(largestStorable);
    });
  });

  describe('a duck that matches only a deleted one', () => {
    it('is created as a new record and leaves the deleted one alone', async () => {
      const deletedId = await storeDuck(pool, { quantity: 99, deleted: true });

      const response = await addDuck(redLarge).expect(201);

      expect(response.body.id).not.toBe(deletedId);
      expect(response.body.quantity).toBe(5);
      const rows = await storedDucks(pool);
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.id === deletedId)).toMatchObject({
        quantity: 99,
        deleted: true,
        version: 1,
      });
    });
  });

  describe('many requests for the same duck at the same moment', () => {
    const REQUESTS = 50;
    const sendAllAtOnce = () =>
      Promise.all(
        Array.from({ length: REQUESTS }, () =>
          addDuck({ ...redLarge, quantity: 3 }),
        ),
      );

    it('create exactly one record holding the full quantity', async () => {
      const responses = await sendAllAtOnce();

      const statuses = responses.map((response) => response.status);
      expect(statuses.filter((status) => status === 201)).toHaveLength(1);
      expect(statuses.filter((status) => status === 200)).toHaveLength(
        REQUESTS - 1,
      );

      const active = (await storedDucks(pool)).filter((row) => !row.deleted);
      expect(active).toHaveLength(1);
      expect(active[0].quantity).toBe(REQUESTS * 3);
      expect(active[0].version).toBe(REQUESTS);
    });

    it('lose no increment when the duck already exists', async () => {
      await storeDuck(pool, { quantity: 100 });

      const responses = await sendAllAtOnce();

      expect(responses.every((response) => response.status === 200)).toBe(true);
      const rows = await storedDucks(pool);
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(100 + REQUESTS * 3);
    });

    it('keep different ducks apart', async () => {
      const kinds = [
        { ...redLarge, quantity: 1 },
        { ...redLarge, price: 12.5, quantity: 1 },
        { ...redLarge, color: 'Black', quantity: 1 },
        { ...redLarge, size: 'XSmall', quantity: 1 },
      ];

      await Promise.all(
        Array.from({ length: 40 }, (_, i) => addDuck(kinds[i % kinds.length])),
      );

      const rows = await storedDucks(pool);
      expect(rows).toHaveLength(kinds.length);
      expect(rows.map((row) => row.quantity)).toEqual([10, 10, 10, 10]);
    });
  });
});
