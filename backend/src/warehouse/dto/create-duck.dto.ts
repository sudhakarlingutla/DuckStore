import { IsIn, IsInt, IsNumber, IsPositive, Max, Min } from 'class-validator';
import { COLORS, type Color } from '../../common/color.js';
import { SIZES, type Size } from '../../common/size.js';
import { MAX_PRICE, MAX_QUANTITY_PER_REQUEST } from '../duck.js';

export class CreateDuckDto {
  @IsIn(COLORS)
  color: Color;

  @IsIn(SIZES)
  size: Size;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MAX_PRICE)
  price: number;

  // Adding zero ducks is not an addition, so the minimum is 1.
  @IsInt()
  @Min(1)
  @Max(MAX_QUANTITY_PER_REQUEST)
  quantity: number;
}
