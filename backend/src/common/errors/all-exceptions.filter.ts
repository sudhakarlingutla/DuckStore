import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ConflictError,
  DomainError,
  ErrorDetail,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from './domain-error.js';

/** The one shape every error response has. */
export interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}

type DomainErrorType = abstract new (...args: never[]) => DomainError;

const DOMAIN_ERROR_STATUS: [DomainErrorType, HttpStatus][] = [
  [ValidationError, HttpStatus.BAD_REQUEST],
  [NotFoundError, HttpStatus.NOT_FOUND],
  [ConflictError, HttpStatus.CONFLICT],
  [UnprocessableError, HttpStatus.UNPROCESSABLE_ENTITY],
];

const FRAMEWORK_ERROR_CODE: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = this.toResponse(exception);
    host
      .switchToHttp()
      .getResponse<Response>()
      .status(body.statusCode)
      .json(body);
  }

  private toResponse(exception: unknown): ErrorResponse {
    if (exception instanceof DomainError) {
      return {
        statusCode: statusOf(exception),
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    const clientStatus = clientErrorStatus(exception);
    if (clientStatus !== undefined) {
      return {
        statusCode: clientStatus,
        code: FRAMEWORK_ERROR_CODE[clientStatus] ?? HttpStatus[clientStatus],
        message: (exception as Error).message,
        details: [],
      };
    }

    // Anything else is a bug or an outage. Log it in full, tell the caller
    // nothing about the internals.
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      details: [],
    };
  }
}

function statusOf(error: DomainError): HttpStatus {
  const match = DOMAIN_ERROR_STATUS.find(([type]) => error instanceof type);
  return match ? match[1] : HttpStatus.INTERNAL_SERVER_ERROR;
}

/**
 * The 4xx status of an error raised by the framework itself: an unknown
 * route, or a body the JSON parser could not read.
 */
function clientErrorStatus(exception: unknown): number | undefined {
  const status =
    exception instanceof HttpException
      ? exception.getStatus()
      : (exception as { status?: unknown } | null)?.status;

  return typeof status === 'number' && status >= 400 && status < 500
    ? status
    : undefined;
}
