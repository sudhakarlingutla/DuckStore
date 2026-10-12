import {
  IsInt,
  IsNumber,
  IsPositive,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { MAX_PRICE, MAX_STOCK_PER_DUCK } from '../duck.js';

/**
 * Only price and quantity can be edited. Color and size are not declared
 * here, so the validation pipe rejects a request that tries to send them.
 */
export class UpdateDuckDto {
  /** The version of the duck the caller was looking at when it edited. */
  @IsInt()
  @Min(1)
  version: number;

  @ValidateIf((dto: UpdateDuckDto) => dto.price !== undefined)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_PRICE)
  price?: number;

  // Zero is allowed here, unlike on add: a duck can be out of stock.
  @ValidateIf((dto: UpdateDuckDto) => dto.quantity !== undefined)
  @IsInt()
  @Min(0)
  @Max(MAX_STOCK_PER_DUCK)
  quantity?: number;
}
