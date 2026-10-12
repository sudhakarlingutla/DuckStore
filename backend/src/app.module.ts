import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, WarehouseModule],
  controllers: [HealthController],
})
export class AppModule {}
