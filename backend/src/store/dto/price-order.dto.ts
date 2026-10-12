import {
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { COLORS, type Color } from '../../common/color.js';
import { SIZES, type Size } from '../../common/size.js';
import { MAX_ORDER_QUANTITY } from '../order.js';
import { SHIPPING_MODES, type ShippingMode } from '../shipping-mode.js';

export class PriceOrderDto {
  @IsIn(COLORS)
  color: Color;

  @IsIn(SIZES)
  size: Size;

  @IsInt()
  @Min(1)
  @Max(MAX_ORDER_QUANTITY)
  quantity: number;

  // Any country is accepted; only USA, Bolivia and India have their own rate.
  @IsString()
  @Matches(/\S/, { message: 'destinationCountry must not be blank' })
  @MaxLength(100)
  destinationCountry: string;

  @IsIn(SHIPPING_MODES)
  shippingMode: ShippingMode;
}
