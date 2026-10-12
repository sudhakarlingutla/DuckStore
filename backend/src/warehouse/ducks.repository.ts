import { Inject, Injectable } from '@nestjs/common';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Color } from '../common/color.js';
import { Money } from '../common/money.js';
import type { Size } from '../common/size.js';
import { DB_POOL } from '../database/database.module.js';
import { hasMysqlCode, retryOnDeadlock } from '../database/mysql-errors.js';
import type { Duck, DuckChanges, IncomingStock } from './duck.js';
import {
  DuckPriceConflictError,
  StockLimitExceededError,
} from './duck-errors.js';

const DUCK_COLUMNS = 'id, color, size, price, quantity, version';

/**
 * Insert the duck, or, if an active duck with the same color, size and price
 * already exists, add to its quantity. This is ONE statement, so the database
 * runs it atomically: two simultaneous requests for the same duck cannot both
 * insert, and neither increment can be lost. The duplicate is detected by the
 * unique index uq_ducks_active_identity (see migrations/001_create_ducks.sql).
 *
 * `id = LAST_INSERT_ID(ducks.id)` makes the driver report the existing row's
 * id when the statement merged instead of inserting.
 */
const ADD_OR_MERGE_SQL = `
  INSERT INTO ducks (color, size, price, quantity)
  VALUES (?, ?, ?, ?) AS incoming
  ON DUPLICATE KEY UPDATE
    quantity = ducks.quantity + incoming.quantity,
    version  = ducks.version + 1,
    id       = LAST_INSERT_ID(ducks.id)`;

// MySQL reports 1 affected row for an insert and 2 for a merge.
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
export class DucksRepository {
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

  async addOrMerge(stock: IncomingStock): Promise<AddResult> {
    const result = await this.runAddOrMerge(stock);
    const [rows] = await this.pool.execute<DuckRow[]>(
      `SELECT ${DUCK_COLUMNS} FROM ducks WHERE id = ?`,
      [result.insertId],
    );
    return {
      duck: toDuck(rows[0]),
      created: result.affectedRows === AFFECTED_ROWS_WHEN_INSERTED,
    };
  }

  private async runAddOrMerge(stock: IncomingStock): Promise<ResultSetHeader> {
    try {
      const [result] = await retryOnDeadlock(() =>
        this.pool.execute<ResultSetHeader>(ADD_OR_MERGE_SQL, [
          stock.color,
          stock.size,
          stock.price.toDecimalString(),
          stock.quantity,
        ]),
      );
      return result;
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
