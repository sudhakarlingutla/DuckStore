import { INestApplication } from '@nestjs/common';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { App } from 'supertest/types';
import { storedDucks, storeDuck } from './support/duck-rows.js';
import { createTestApp } from './support/test-app.js';
import { clearDucks, createTestPool } from './support/test-database.js';

describe('DELETE /api/ducks/:id', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const deleteDuck = (id: number) =>
    request(app.getHttpServer()).delete(`/api/ducks/${id}`);

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

  it('keeps the record in the database, flagged as deleted', async () => {
    const id = await storeDuck(pool, { price: '10.00', quantity: 5 });

    const response = await deleteDuck(id).expect(204);

    expect(response.body).toEqual({});
    expect(await storedDucks(pool)).toEqual([
      {
        id,
        color: 'Red',
        size: 'Large',
        price: '10.00',
        quantity: 5,
        deleted: true,
        version: 2,
      },
    ]);
  });

  it('removes the duck from the listing', async () => {
    const kept = await storeDuck(pool, { price: '1.00' });
    const removed = await storeDuck(pool, { price: '2.00' });

    await deleteDuck(removed).expect(204);

    const listing = await request(app.getHttpServer())
      .get('/api/ducks')
      .expect(200);
    expect(listing.body.map((duck: { id: number }) => duck.id)).toEqual([kept]);
  });

  it('answers 404 the second time', async () => {
    const id = await storeDuck(pool);
    await deleteDuck(id).expect(204);

    const response = await deleteDuck(id).expect(404);

    expect(response.body.code).toBe('DUCK_NOT_FOUND');
  });

  it('answers 404 for an id that never existed', async () => {
    const response = await deleteDuck(12345).expect(404);

    expect(response.body.code).toBe('DUCK_NOT_FOUND');
  });

  it('lets only one of many simultaneous deletes succeed', async () => {
    const id = await storeDuck(pool);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => deleteDuck(id)),
    );

    const statuses = responses.map((response) => response.status);
    expect(statuses.filter((status) => status === 204)).toHaveLength(1);
    expect(statuses.filter((status) => status === 404)).toHaveLength(9);
  });

  it('makes room for the same duck to be added again as a new record', async () => {
    const duck = { color: 'Red', size: 'Large', price: 10, quantity: 5 };
    const first = await request(app.getHttpServer())
      .post('/api/ducks')
      .send(duck)
      .expect(201);
    await deleteDuck(first.body.id).expect(204);

    const second = await request(app.getHttpServer())
      .post('/api/ducks')
      .send({ ...duck, quantity: 8 })
      .expect(201);

    expect(second.body.id).not.toBe(first.body.id);
    expect(second.body.quantity).toBe(8);
  });
});
