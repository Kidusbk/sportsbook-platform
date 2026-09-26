import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '@sportsbook/shared';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};
        for (const issue of error.issues) {
          const path = issue.path.join('.') || 'body';
          if (!details[path]) details[path] = [];
          details[path]!.push(issue.message);
        }
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
