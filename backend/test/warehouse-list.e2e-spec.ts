import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('GET /api/ducks', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const listDucks = () => request(app.getHttpServer()).get('/api/ducks');

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

  it('returns an empty list for an empty warehouse', async () => {
    await listDucks().expect(200, []);
  });

  it('returns each duck with its id, color, size, price, quantity and version', async () => {
    const id = await storeDuck(pool, {
      color: 'Yellow',
      size: 'XSmall',
      price: '19.99',
      quantity: 40,
      version: 3,
    });

    await listDucks().expect(200, [
      {
        id,
        color: 'Yellow',
        size: 'XSmall',
        price: 19.99,
        quantity: 40,
        version: 3,
      },
    ]);
  });

  it('sorts by quantity, largest first, and by id when quantities are equal', async () => {
    const few = await storeDuck(pool, { price: '1.00', quantity: 3 });
    const tiedFirst = await storeDuck(pool, { price: '2.00', quantity: 50 });
    const most = await storeDuck(pool, { price: '3.00', quantity: 900 });
    const tiedSecond = await storeDuck(pool, { price: '4.00', quantity: 50 });

    const response = await listDucks().expect(200);

    expect(response.body.map((duck: { id: number }) => duck.id)).toEqual([
      most,
      tiedFirst,
      tiedSecond,
      few,
    ]);
  });

  it('leaves out deleted ducks', async () => {
    const active = await storeDuck(pool, { price: '1.00' });
    await storeDuck(pool, { price: '2.00', deleted: true });

    const response = await listDucks().expect(200);

    expect(response.body.map((duck: { id: number }) => duck.id)).toEqual([
      active,
    ]);
  });

  it('still shows a duck that is out of stock', async () => {
    const id = await storeDuck(pool, { quantity: 0 });

    const response = await listDucks().expect(200);

    expect(response.body).toMatchObject([{ id, quantity: 0 }]);
  });
});
