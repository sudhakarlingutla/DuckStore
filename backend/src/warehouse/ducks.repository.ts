import { Inject, Injectable } from '@nestjs/common';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Color } from '../common/color.js';
import { Money } from '../common/money.js';
import type { Size } from '../common/size.js';
import { DB_POOL } from '../database/database.module.js';
import type { StockReader } from './stock-reader.js';
import { hasMysqlCode, retryOnDeadlock } from '../database/mysql-errors.js';
import type { Duck, DuckChanges, IncomingStock } from './duck.js';
import {
  DuckPriceConflictError,
  StockLimitExceededError,
} from './duck-errors.js';

const DUCK_COLUMNS = 'id, color, size, price, quantity, version';

/**
 * Adding stock is done in up to two statements, each atomic on its own.
 *
 * 1. MERGE_INTO_EXISTING_SQL adds to the active duck with this color, size
 *    and price, if there is one. This is the common case.
 *
 * 2. If there was none, ADD_OR_MERGE_SQL inserts it. Another request may have
 *    inserted the same duck in the meantime; the unique index
 *    uq_ducks_active_identity (see migrations/001_create_ducks.sql) detects
 *    that, and the statement adds to that duck instead of inserting. So two
 *    simultaneous requests can never create two records, and no increment is
 *    ever lost.
 *
 * Statement 2 alone would be correct. Statement 1 is there because MySQL
 * reserves an auto-increment id for every attempted insert, even one that
 * ends up merging; going through it for every merge would leave large gaps
 * in the ids.
 *
 * `id = LAST_INSERT_ID(id)` makes the driver report which row was updated.
 */
const MERGE_INTO_EXISTING_SQL = `
  UPDATE ducks
     SET quantity = quantity + ?,
         version  = version + 1,
         id       = LAST_INSERT_ID(id)
   WHERE color = ? AND size = ? AND price = ? AND deleted = FALSE`;

const ADD_OR_MERGE_SQL = `
  INSERT INTO ducks (color, size, price, quantity)
  VALUES (?, ?, ?, ?) AS incoming
  ON DUPLICATE KEY UPDATE
    quantity = ducks.quantity + incoming.quantity,
    version  = ducks.version + 1,
    id       = LAST_INSERT_ID(ducks.id)`;

// For ADD_OR_MERGE_SQL, MySQL reports 1 affected row for an insert and 2
// for a merge.
const AFFECTED_ROWS_WHEN_INSERTED = 1;

interface DuckRow extends RowDataPacket {
  id: number;
  color: Color;
  size: Size;
  price: string;
  quantity: number;
  version: number;
}

export interface AddResult {
  duck: Duck;
  /** True when a new record was created, false when it was merged. */
  created: boolean;
}

/** All SQL for the ducks table lives here. */
@Injectable()
export class DucksRepository implements StockReader {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  /** Active ducks, largest stock first; equal stock is ordered by id. */
  async findAllActive(): Promise<Duck[]> {
    const [rows] = await this.pool.execute<DuckRow[]>(
      `SELECT ${DUCK_COLUMNS} FROM ducks
        WHERE deleted = FALSE
        ORDER BY quantity DESC, id ASC`,
    );
    return rows.map(toDuck);
  }

  async findActiveByColorAndSize(color: Color, size: Size): Promise<Duck[]> {
    const [rows] = await this.pool.execute<DuckRow[]>(
      `SELECT ${DUCK_COLUMNS} FROM ducks
        WHERE color = ? AND size = ? AND deleted = FALSE`,
      [color, size],
    );
    return rows.map(toDuck);
  }

  async findActiveById(id: number): Promise<Duck | undefined> {
    const [rows] = await this.pool.execute<DuckRow[]>(
      `SELECT ${DUCK_COLUMNS} FROM ducks WHERE id = ? AND deleted = FALSE`,
      [id],
    );
    return rows[0] ? toDuck(rows[0]) : undefined;
  }

  /**
   * Applies the changes only if the duck is active and still at the version
   * the caller saw. The version check and the write are one statement, so a
   * change made in between can never be silently overwritten.
   * Returns whether the changes were applied.
   */
  async updateIfUnchanged(
    id: number,
    expectedVersion: number,
    changes: DuckChanges,
  ): Promise<boolean> {
    try {
      const [result] = await retryOnDeadlock(() =>
        this.pool.execute<ResultSetHeader>(
          `UPDATE ducks
              SET price    = COALESCE(?, price),
                  quantity = COALESCE(?, quantity),
                  version  = version + 1
            WHERE id = ? AND version = ? AND deleted = FALSE`,
          [
            changes.price?.toDecimalString() ?? null,
            changes.quantity ?? null,
            id,
            expectedVersion,
          ],
        ),
      );
      return result.affectedRows === 1;
    } catch (error) {
      // The unique index refused the new price: another active duck of the
      // same color and size already has it.
      if (hasMysqlCode(error, 'ER_DUP_ENTRY')) {
        throw new DuckPriceConflictError();
      }
      throw error;
    }
  }

  /**
   * Logical delete: the row stays, flagged as deleted. Returns false when
   * there was no active duck with that id.
   */
  async markDeleted(id: number): Promise<boolean> {
    const [result] = await retryOnDeadlock(() =>
      this.pool.execute<ResultSetHeader>(
        `UPDATE ducks
            SET deleted = TRUE, version = version + 1
          WHERE id = ? AND deleted = FALSE`,
        [id],
      ),
    );
    return result.affectedRows === 1;
  }

  async addOrMerge(stock: IncomingStock): Promise<AddResult> {
    const { id, created } = await this.writeStock(stock);
    const [rows] = await this.pool.execute<DuckRow[]>(
      `SELECT ${DUCK_COLUMNS} FROM ducks WHERE id = ?`,
      [id],
    );
    return { duck: toDuck(rows[0]), created };
  }

  private async writeStock(
    stock: IncomingStock,
  ): Promise<{ id: number; created: boolean }> {
    const price = stock.price.toDecimalString();
    try {
      const [merged] = await retryOnDeadlock(() =>
        this.pool.execute<ResultSetHeader>(MERGE_INTO_EXISTING_SQL, [
          stock.quantity,
          stock.color,
          stock.size,
          price,
        ]),
      );
      if (merged.affectedRows === 1) {
        return { id: merged.insertId, created: false };
      }

      const [added] = await retryOnDeadlock(() =>
        this.pool.execute<ResultSetHeader>(ADD_OR_MERGE_SQL, [
          stock.color,
          stock.size,
          price,
          stock.quantity,
        ]),
      );
      return {
        id: added.insertId,
        created: added.affectedRows === AFFECTED_ROWS_WHEN_INSERTED,
      };
    } catch (error) {
      if (
        hasMysqlCode(error, 'ER_WARN_DATA_OUT_OF_RANGE', 'ER_DATA_OUT_OF_RANGE')
      ) {
        throw new StockLimitExceededError();
      }
      throw error;
    }
  }
}

function toDuck(row: DuckRow): Duck {
  return {
    id: row.id,
    color: row.color,
    size: row.size,
    price: Money.fromDecimalString(row.price),
    quantity: row.quantity,
    version: row.version,
  };
}
