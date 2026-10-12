import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ValidationError } from '../common/errors/domain-error.js';
import { Money } from '../common/money.js';
import { DucksService } from './ducks.service.js';
import { CreateDuckDto } from './dto/create-duck.dto.js';
import { DuckResponse, toDuckResponse } from './dto/duck.response.js';
import { UpdateDuckDto } from './dto/update-duck.dto.js';

@Controller('ducks')
export class DucksController {
  constructor(private readonly ducks: DucksService) {}

  @Get()
  async list(): Promise<DuckResponse[]> {
    const ducks = await this.ducks.list();
    return ducks.map(toDuckResponse);
  }

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

  @Patch(':id')
  async edit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateDuckDto,
  ): Promise<DuckResponse> {
    if (body.price === undefined && body.quantity === undefined) {
      throw new ValidationError([
        { field: 'price', message: 'Send a price, a quantity, or both.' },
      ]);
    }
    const duck = await this.ducks.edit(id, body.version, {
      price:
        body.price === undefined ? undefined : Money.fromNumber(body.price),
      quantity: body.quantity,
    });
    return toDuckResponse(duck);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.ducks.delete(id);
  }
}
