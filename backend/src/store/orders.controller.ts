import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OrderPricingService } from './order-pricing.service.js';
import {
  OrderQuoteResponse,
  toOrderQuoteResponse,
} from './dto/order-quote.response.js';
import { PriceOrderDto } from './dto/price-order.dto.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly pricing: OrderPricingService) {}

  /** 200, not 201: pricing an order creates nothing. */
  @Post('price')
  @HttpCode(HttpStatus.OK)
  async price(@Body() body: PriceOrderDto): Promise<OrderQuoteResponse> {
    const quote = await this.pricing.quote({
      color: body.color,
      size: body.size,
      quantity: body.quantity,
      destinationCountry: body.destinationCountry,
      shippingMode: body.shippingMode,
    });
    return toOrderQuoteResponse(quote);
  }
}
