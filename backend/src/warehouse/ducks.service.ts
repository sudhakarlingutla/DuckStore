import { Injectable } from '@nestjs/common';
import type { Duck, DuckChanges, IncomingStock } from './duck.js';
import { DuckNotFoundError, StaleVersionError } from './duck-errors.js';
import { AddResult, DucksRepository } from './ducks.repository.js';

@Injectable()
export class DucksService {
  constructor(private readonly ducks: DucksRepository) {}

  /** Every duck that has not been deleted, sorted by quantity. */
  list(): Promise<Duck[]> {
    return this.ducks.findAllActive();
  }

  /**
   * Adds stock. If an active duck with the same color, size and price exists
   * its quantity grows; otherwise a new record is created. A deleted duck
   * never counts as existing.
   */
  add(stock: IncomingStock): Promise<AddResult> {
    return this.ducks.addOrMerge(stock);
  }

  /**
   * Changes the price and/or quantity of a duck. The caller states which
   * version of the duck it was looking at; if the duck has changed since
   * (for example stock was added), the edit is refused instead of
   * overwriting that change.
   */
  async edit(
    id: number,
    expectedVersion: number,
    changes: DuckChanges,
  ): Promise<Duck> {
    const applied = await this.ducks.updateIfUnchanged(
      id,
      expectedVersion,
      changes,
    );
    const duck = await this.ducks.findActiveById(id);
    if (!duck) {
      throw new DuckNotFoundError(id);
    }
    if (!applied) {
      throw new StaleVersionError();
    }
    return duck;
  }

  /** Logically deletes a duck. It stays in the database but is never listed. */
  async delete(id: number): Promise<void> {
    const deleted = await this.ducks.markDeleted(id);
    if (!deleted) {
      throw new DuckNotFoundError(id);
    }
  }
}
