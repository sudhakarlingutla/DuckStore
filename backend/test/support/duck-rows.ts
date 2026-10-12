import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

/** A row exactly as stored, including deleted ones. */
export interface StoredDuck {
  id: number;
  color: string;
  size: string;
  price: string;
  quantity: number;
  deleted: boolean;
  version: number;
}

/** Reads the table directly, so tests can check what is really stored. */
export async function storedDucks(pool: Pool): Promise<StoredDuck[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, color, size, price, quantity, deleted, version
       FROM ducks ORDER BY id`,
  );
  return rows.map((row) => ({
    id: row.id,
    color: row.color,
    size: row.size,
    price: row.price,
    quantity: row.quantity,
    deleted: row.deleted === 1,
    version: row.version,
  }));
}

/** Puts a row in place directly, to set up a starting state. */
export async function storeDuck(
  pool: Pool,
  duck: Partial<Omit<StoredDuck, 'id'>> = {},
): Promise<number> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO ducks (color, size, price, quantity, deleted, version)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      duck.color ?? 'Red',
      duck.size ?? 'Large',
      duck.price ?? '10.00',
      duck.quantity ?? 5,
      duck.deleted ?? false,
      duck.version ?? 1,
    ],
  );
  return result.insertId;
}
