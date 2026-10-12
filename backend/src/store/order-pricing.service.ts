import { Inject, Injectable } from '@nestjs/common';
import { STOCK_READER, type StockReader } from '../warehouse/stock-reader.js';
import type { OrderQuote, OrderRequest } from './order.js';
import { choosePackaging } from './packaging/packaging.js';
import { selectDuckForOrder } from './price-selection.js';
import { priceOrder } from './pricing/pricing-engine.js';

@Injectable()
export class OrderPricingService {
  constructor(@Inject(STOCK_READER) private readonly stock: StockReader) {}

  /**
   * Works out the packaging and the price of an order.
   *
   * This is a quote: it reads the warehouse but changes nothing. Stock is
   * not reserved or reduced, so asking twice gives the same answer. See the
   * README for the reasoning.
   */
  async quote(order: OrderRequest): Promise<OrderQuote> {
    const candidates = await this.stock.findActiveByColorAndSize(
      order.color,
      order.size,
    );
    const duck = selectDuckForOrder(candidates, order);
    const packaging = choosePackaging(order.size, order.shippingMode);
    const price = priceOrder({
      unitPrice: duck.price,
      quantity: order.quantity,
      packageType: packaging.packageType,
      destinationCountry: order.destinationCountry,
      shippingMode: order.shippingMode,
    });

    return { duck, quantity: order.quantity, packaging, price };
  }
}
