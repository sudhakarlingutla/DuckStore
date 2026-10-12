import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health/health.controller.js';
import { StoreModule } from './store/store.module.js';
import { WarehouseModule } from './warehouse/warehouse.module.js';

@Module({
  imports: [ConfigModule, DatabaseModule, WarehouseModule, StoreModule],
  controllers: [HealthController],
})
export class AppModule {}
