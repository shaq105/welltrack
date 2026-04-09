import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

interface PrismaError extends Error {
  code?: string;
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    const message = err.issues.map((e) => e.message).join('; ');
    res.status(400).json({ error: 'Validation Error', message });
    return;
  }

  const prismaErr = err as PrismaError;
  if (prismaErr?.code === 'P2002') {
    res.status(409).json({ error: 'Conflict', message: 'A record with that value already exists' });
    return;
  }

  if (prismaErr?.code === 'P2025') {
    res.status(404).json({ error: 'Not Found', message: 'Record not found' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal Server Error', message: 'An unexpected error occurred' });
}
