import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from '../src/common/errors/domain-error.js';
import { createTestApp } from './support/test-app.js';

class ProbeDto {
  @IsString()
  name: string;
}

/** Test-only routes that fail in each of the ways the API can fail. */
@Controller('probe')
class ProbeController {
  @Post()
  echo(@Body() body: ProbeDto): ProbeDto {
    return body;
  }

  @Get('not-found')
  notFound(): never {
    throw new NotFoundError('THING_NOT_FOUND', 'No such thing.');
  }

  @Get('conflict')
  conflict(): never {
    throw new ConflictError('THING_CONFLICT', 'The thing changed.');
  }

  @Get('unprocessable')
  unprocessable(): never {
    throw new UnprocessableError('THING_IMPOSSIBLE', 'Cannot be done.');
  }

  @Get('crash')
  crash(): never {
    throw new Error('connection to db-internal-7 lost, password=hunter2');
  }
}

describe('error responses', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp([ProbeController]);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['not-found', 404, 'THING_NOT_FOUND', 'No such thing.'],
    ['conflict', 409, 'THING_CONFLICT', 'The thing changed.'],
    ['unprocessable', 422, 'THING_IMPOSSIBLE', 'Cannot be done.'],
  ])(
    'maps a domain error on /%s to status %i',
    async (path, statusCode, code, message) => {
      await request(app.getHttpServer())
        .get(`/api/probe/${path}`)
        .expect(statusCode, { statusCode, code, message, details: [] });
    },
  );

  it('names each invalid field in a validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .send({ name: 42 })
      .expect(400);

    expect(response.body).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'The request is not valid.',
      details: [{ field: 'name', message: 'name must be a string' }],
    });
  });

  it('rejects a field the endpoint does not know', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .send({ name: 'duck', extra: true })
      .expect(400);

    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(response.body.details).toEqual([
      { field: 'extra', message: 'property extra should not exist' },
    ]);
  });

  it('reports malformed JSON as a validation error', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/probe')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details: [],
    });
  });

  it('answers an unknown route in the same shape', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/no-such-route')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      details: [],
    });
  });

  it('hides the cause of an unexpected failure', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/probe/crash')
      .expect(500);

    expect(response.body).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      details: [],
    });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
  });

  it('still serves the health check', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .expect(200, { status: 'ok' });
  });
});
