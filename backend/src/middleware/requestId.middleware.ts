import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = (req.headers['x-request-id'] as string | undefined) ?? uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};
