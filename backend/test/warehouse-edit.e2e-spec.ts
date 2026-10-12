import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storedDucks, storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('PATCH /api/ducks/:id', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const editDuck = (id: number, body: object) =>
    request(app.getHttpServer()).patch(`/api/ducks/${id}`).send(body);
  const stored = async (id: number) =>
    (await storedDucks(pool)).find((row) => row.id === id);

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

  describe('changing price and quantity', () => {
    it.each([
      ['the price only', { price: 12.5 }, { price: '12.50', quantity: 5 }],
      ['the quantity only', { quantity: 80 }, { price: '10.00', quantity: 80 }],
      ['both', { price: 12.5, quantity: 80 }, { price: '12.50', quantity: 80 }],
    ])(
      'changes %s and moves the version on by one',
      async (_, changes, expected) => {
        const id = await storeDuck(pool, { price: '10.00', quantity: 5 });

        const response = await editDuck(id, { version: 1, ...changes }).expect(
          200,
        );

        expect(response.body).toMatchObject({ id, version: 2 });
        expect(await stored(id)).toMatchObject({ ...expected, version: 2 });
      },
    );

    it('returns the duck as it now is', async () => {
      const id = await storeDuck(pool, { color: 'Green', size: 'Small' });

      await editDuck(id, { version: 1, price: 3.75, quantity: 9 }).expect(200, {
        id,
        color: 'Green',
        size: 'Small',
        price: 3.75,
        quantity: 9,
        version: 2,
      });
    });

    it('allows the quantity to be set to zero', async () => {
      const id = await storeDuck(pool);

      await editDuck(id, { version: 1, quantity: 0 }).expect(200);

      expect(await stored(id)).toMatchObject({ quantity: 0, deleted: false });
    });
  });

  describe('a duck that is not there', () => {
    it('answers 404 for an id that never existed', async () => {
      const response = await editDuck(12345, { version: 1, price: 2 }).expect(
        404,
      );

      expect(response.body.code).toBe('DUCK_NOT_FOUND');
    });

    it('answers 404 for a deleted duck and leaves it untouched', async () => {
      const id = await storeDuck(pool, { deleted: true });

      const response = await editDuck(id, { version: 1, price: 2 }).expect(404);

      expect(response.body.code).toBe('DUCK_NOT_FOUND');
      expect(await stored(id)).toMatchObject({ price: '10.00', version: 1 });
    });
  });

  describe('a price that another duck already has', () => {
    it('is refused when the other duck is active, and neither changes', async () => {
      const cheap = await storeDuck(pool, { price: '10.00', quantity: 5 });
      const dear = await storeDuck(pool, { price: '20.00', quantity: 7 });

      const response = await editDuck(dear, { version: 1, price: 10 }).expect(
        409,
      );

      expect(response.body.code).toBe('DUCK_PRICE_CONFLICT');
      expect(await stored(cheap)).toMatchObject({
        price: '10.00',
        quantity: 5,
        version: 1,
      });
      expect(await stored(dear)).toMatchObject({
        price: '20.00',
        quantity: 7,
        version: 1,
      });
    });

    it('is allowed when the other duck has a different color or size', async () => {
      await storeDuck(pool, { color: 'Black', price: '10.00' });
      const id = await storeDuck(pool, { color: 'Red', price: '20.00' });

      await editDuck(id, { version: 1, price: 10 }).expect(200);
    });

    it('is allowed when the other duck is deleted', async () => {
      await storeDuck(pool, { price: '10.00', deleted: true });
      const id = await storeDuck(pool, { price: '20.00' });

      await editDuck(id, { version: 1, price: 10 }).expect(200);
    });
  });

  describe('an edit based on an out-of-date version', () => {
    it('is refused and changes nothing', async () => {
      const id = await storeDuck(pool, { quantity: 5, version: 4 });

      const response = await editDuck(id, { version: 3, quantity: 1 }).expect(
        409,
      );

      expect(response.body.code).toBe('STALE_VERSION');
      expect(await stored(id)).toMatchObject({ quantity: 5, version: 4 });
    });

    it('cannot wipe out stock that was added while the form was open', async () => {
      // The user opens the edit form and sees 5 ducks at version 1.
      const duck = { color: 'Red', size: 'Large', price: 10, quantity: 5 };
      const opened = await request(app.getHttpServer())
        .post('/api/ducks')
        .send(duck)
        .expect(201);

      // Meanwhile a delivery of 100 arrives and is merged in.
      await request(app.getHttpServer())
        .post('/api/ducks')
        .send({ ...duck, quantity: 100 })
        .expect(200);

      // Saving the form with the old version must not reset stock to 6.
      await editDuck(opened.body.id, {
        version: opened.body.version,
        quantity: 6,
      }).expect(409);

      expect(await stored(opened.body.id)).toMatchObject({ quantity: 105 });
    });

    it('lets only one of two simultaneous edits through', async () => {
      const id = await storeDuck(pool, { quantity: 5 });

      const responses = await Promise.all([
        editDuck(id, { version: 1, quantity: 11 }),
        editDuck(id, { version: 1, quantity: 22 }),
      ]);

      const statuses = responses.map((response) => response.status).sort();
      expect(statuses).toEqual([200, 409]);
      const winner = responses.find((response) => response.status === 200)!;
      expect(await stored(id)).toMatchObject({
        quantity: winner.body.quantity,
        version: 2,
      });
    });
  });
});
