import { Module } from '@nestjs/common';
import { WarehouseModule } from '../warehouse/warehouse.module.js';
import { OrderPricingService } from './order-pricing.service.js';
import { OrdersController } from './orders.controller.js';

@Module({
  imports: [WarehouseModule],
  controllers: [OrdersController],
  providers: [OrderPricingService],
})
export class StoreModule {}
