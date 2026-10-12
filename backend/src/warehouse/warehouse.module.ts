import { Module } from '@nestjs/common';
import { DucksController } from './ducks.controller.js';
import { DucksRepository } from './ducks.repository.js';
import { DucksService } from './ducks.service.js';

@Module({
  controllers: [DucksController],
  providers: [DucksService, DucksRepository],
})
export class WarehouseModule {}
