import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for production cross-origin requests
 * Skipped for localhost and safe HTTP methods
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
    const isLocalhost = req.headers.origin?.includes('localhost') || false;

    // Skip CSRF check for localhost or safe methods
    if (isLocalhost || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip for auth endpoints (CSRF token doesn't exist yet)
    const authEndpoints = [
        '/api/auth/login-verify',
        '/api/auth/signup',
        '/api/auth/check-user',
        '/api/auth/logout'
    ];

    if (authEndpoints.includes(req.path)) {
        return next();
    }

    // Validate CSRF for production state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const tokenFromHeader = req.headers['x-csrf-token'] as string;
        const tokenFromCookie = req.cookies['csrf-token'];

        if (!tokenFromHeader || tokenFromHeader !== tokenFromCookie) {
            res.status(403).json({
                error: 'Invalid CSRF token',
                message: 'CSRF token validation failed'
            });
            return;
        }
    }

    next();
};
