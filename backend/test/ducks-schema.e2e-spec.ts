import type { Pool } from 'mysql2/promise';
import { clearDucks, createTestPool } from './support/test-database.js';

/**
 * These tests bypass the application and write straight to the table. They
 * prove the warehouse invariant is enforced by the database itself, so no
 * code path and no race between requests can break it.
 */
describe('ducks table constraints', () => {
  let pool: Pool;

  const insertDuck = (price: string, deleted = false) =>
    pool.query(
      `INSERT INTO ducks (color, size, price, quantity, deleted)
       VALUES ('Red', 'Large', ?, 5, ?)`,
      [price, deleted],
    );

  beforeAll(() => {
    pool = createTestPool();
  });

  beforeEach(async () => {
    await clearDucks(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('rejects a second active duck with the same color, size and price', async () => {
    await insertDuck('10.00');

    await expect(insertDuck('10.00')).rejects.toMatchObject({
      code: 'ER_DUP_ENTRY',
    });
  });

  it('treats 10 and 10.00 as the same price', async () => {
    await insertDuck('10');

    await expect(insertDuck('10.00')).rejects.toMatchObject({
      code: 'ER_DUP_ENTRY',
    });
  });

  it('allows the same color and size at a different price', async () => {
    await insertDuck('10.00');

    await expect(insertDuck('10.01')).resolves.toBeDefined();
  });

  it('allows an active duck alongside any number of deleted look-alikes', async () => {
    await insertDuck('10.00', true);
    await insertDuck('10.00', true);

    await expect(insertDuck('10.00')).resolves.toBeDefined();
  });

  it.each(['0', '-1.00'])('rejects a price of %s', async (price) => {
    await expect(insertDuck(price)).rejects.toMatchObject({
      code: 'ER_CHECK_CONSTRAINT_VIOLATED',
    });
  });
});
