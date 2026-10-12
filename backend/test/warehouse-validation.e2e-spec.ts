import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storedDucks, storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('warehouse request validation', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const fieldsIn = (body: { details: { field: string }[] }) =>
    body.details.map((detail) => detail.field);

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

  describe('POST /api/ducks', () => {
    const valid = { color: 'Red', size: 'Large', price: 10, quantity: 5 };
    const without = (field: keyof typeof valid) => {
      const { [field]: _omitted, ...rest } = valid;
      return rest;
    };

    it.each([
      ['no color', without('color'), 'color'],
      ['no size', without('size'), 'size'],
      ['no price', without('price'), 'price'],
      ['no quantity', without('quantity'), 'quantity'],
      ['an unknown color', { ...valid, color: 'Purple' }, 'color'],
      ['a color in the wrong case', { ...valid, color: 'red' }, 'color'],
      ['an unknown size', { ...valid, size: 'Huge' }, 'size'],
      ['a price of zero', { ...valid, price: 0 }, 'price'],
      ['a negative price', { ...valid, price: -5 }, 'price'],
      ['a price with three decimals', { ...valid, price: 9.999 }, 'price'],
      ['a price sent as text', { ...valid, price: '10' }, 'price'],
      ['a price above the maximum', { ...valid, price: 1_000_000 }, 'price'],
      ['a quantity of zero', { ...valid, quantity: 0 }, 'quantity'],
      ['a negative quantity', { ...valid, quantity: -1 }, 'quantity'],
      ['a fractional quantity', { ...valid, quantity: 1.5 }, 'quantity'],
      ['a quantity sent as text', { ...valid, quantity: '5' }, 'quantity'],
      [
        'a quantity above the maximum',
        { ...valid, quantity: 1_000_001 },
        'quantity',
      ],
      ['a field it does not know', { ...valid, deleted: true }, 'deleted'],
      ['an id chosen by the caller', { ...valid, id: 7 }, 'id'],
    ])('rejects %s and stores nothing', async (_, body, field) => {
      const response = await request(app.getHttpServer())
        .post('/api/ducks')
        .send(body)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(fieldsIn(response.body)).toContain(field);
      expect(await storedDucks(pool)).toEqual([]);
    });

    it('reports every invalid field at once', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/ducks')
        .send({ color: 'Purple', size: 'Huge', price: -1, quantity: 0 })
        .expect(400);

      expect(new Set(fieldsIn(response.body))).toEqual(
        new Set(['color', 'size', 'price', 'quantity']),
      );
    });

    it('accepts the largest price and quantity allowed', async () => {
      await request(app.getHttpServer())
        .post('/api/ducks')
        .send({ ...valid, price: 999_999.99, quantity: 1_000_000 })
        .expect(201);
    });
  });

  describe('PATCH /api/ducks/:id', () => {
    it.each([
      ['no version', { price: 12 }, 'version'],
      ['neither a price nor a quantity', { version: 1 }, 'price'],
      ['a color', { version: 1, price: 12, color: 'Green' }, 'color'],
      ['a size', { version: 1, price: 12, size: 'Small' }, 'size'],
      ['a price of zero', { version: 1, price: 0 }, 'price'],
      ['a null price', { version: 1, price: null }, 'price'],
      ['a price with three decimals', { version: 1, price: 1.005 }, 'price'],
      ['a negative quantity', { version: 1, quantity: -1 }, 'quantity'],
      ['a fractional quantity', { version: 1, quantity: 2.5 }, 'quantity'],
      ['a fractional version', { version: 1.5, quantity: 2 }, 'version'],
    ])('rejects %s and changes nothing', async (_, body, field) => {
      const id = await storeDuck(pool, { price: '10.00', quantity: 5 });

      const response = await request(app.getHttpServer())
        .patch(`/api/ducks/${id}`)
        .send(body)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(fieldsIn(response.body)).toContain(field);
      expect((await storedDucks(pool))[0]).toMatchObject({
        color: 'Red',
        size: 'Large',
        price: '10.00',
        quantity: 5,
        version: 1,
      });
    });
  });

  describe('an id in the path that is not a whole number', () => {
    it.each(['abc', '1.5'])('is rejected on edit: %s', async (id) => {
      const response = await request(app.getHttpServer())
        .patch(`/api/ducks/${id}`)
        .send({ version: 1, price: 12 })
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });

    it.each(['abc', '1.5'])('is rejected on delete: %s', async (id) => {
      const response = await request(app.getHttpServer())
        .delete(`/api/ducks/${id}`)
        .expect(400);

      expect(response.body.code).toBe('VALIDATION_ERROR');
    });
  });
});
