import { Body, Controller, HttpStatus, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { Money } from '../common/money.js';
import { DucksService } from './ducks.service.js';
import { CreateDuckDto } from './dto/create-duck.dto.js';
import { DuckResponse, toDuckResponse } from './dto/duck.response.js';

@Controller('ducks')
export class DucksController {
  constructor(private readonly ducks: DucksService) {}

  /** 201 when a new duck was created, 200 when it was merged into one. */
  @Post()
  async add(
    @Body() body: CreateDuckDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<DuckResponse> {
    const { duck, created } = await this.ducks.add({
      color: body.color,
      size: body.size,
      price: Money.fromNumber(body.price),
      quantity: body.quantity,
    });
    response.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return toDuckResponse(duck);
  }
}
