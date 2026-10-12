import { Injectable } from '@nestjs/common';
import type { Duck, IncomingStock } from './duck.js';
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
}
