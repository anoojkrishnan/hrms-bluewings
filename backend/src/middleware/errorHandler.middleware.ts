import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { ZodError } from 'zod';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AppError } from '@/shared/errors/AppError';
import { ErrorCodes } from '@/shared/errors/errorCodes';
import { errorResponse } from '@/shared/utils/response';
import { logger } from '@/config/logger';

interface MongoServerError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void => {
  const requestId = req.requestId;

  if (err instanceof AppError) {
    res.status(err.statusCode).json(errorResponse(err.errorCode, err.message, err.details));
    return;
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    const formErrors: string[] = [];
    for (const issue of err.issues) {
      const parts = issue.path.slice(1); // strip leading 'body'/'query'/'params' wrapper
      if (parts.length === 0) {
        formErrors.push(issue.message);
      } else {
        const key = parts.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
    }
    res.status(400).json(
      errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', { fieldErrors, formErrors }),
    );
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    const details = Object.values(err.errors).map((e) => e.message);
    res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Validation failed', details));
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(400).json(errorResponse(ErrorCodes.VALIDATION_ERROR, 'Invalid ID format'));
    return;
  }

  const mongoErr = err as MongoServerError;
  if (mongoErr.code === 11000) {
    res.status(409).json(errorResponse(ErrorCodes.DUPLICATE_RECORD, 'Duplicate record', mongoErr.keyValue));
    return;
  }

  if (err instanceof TokenExpiredError) {
    res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED, 'Token expired'));
    return;
  }

  if (err instanceof JsonWebTokenError) {
    res.status(401).json(errorResponse(ErrorCodes.UNAUTHORIZED, 'Invalid token'));
    return;
  }

  logger.error({ err, requestId }, 'Unhandled error');

  res.status(500).json(
    errorResponse(
      ErrorCodes.INTERNAL_ERROR,
      process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ),
  );
};
