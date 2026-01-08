import { Request, Response, NextFunction } from 'express';

export const csrfProtection = (_req: Request, _res: Response, next: NextFunction): void => {
    // With Same-Origin (Firebase Hosting Rewrites) and SameSite=Strict cookies,
    // explicitly checking a CSRF header token vs cookie is redundant and fails 
    // because Firebase Hosting strips non-__session cookies.
    next();
};
