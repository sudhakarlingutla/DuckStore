import { Module } from '@nestjs/common';
import { DucksController } from './ducks.controller.js';
import { DucksRepository } from './ducks.repository.js';
import { DucksService } from './ducks.service.js';
import { STOCK_READER } from './stock-reader.js';

@Module({
  controllers: [DucksController],
  providers: [
    DucksService,
    DucksRepository,
    { provide: STOCK_READER, useExisting: DucksRepository },
  ],
  // Only the read-only view leaves this module.
  exports: [STOCK_READER],
})
export class WarehouseModule {}
