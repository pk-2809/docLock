import { Request, Response } from 'express';
import crypto from 'crypto';

/**
 * Cookie Configuration Utility
 * Provides environment-aware cookie settings for Safari compatibility
 */
export class CookieUtil {
    /**
     * Get environment-aware cookie configuration
     * - Localhost: sameSite=lax, secure=false (works in Safari)
     * - Production: sameSite=none, secure=true (cross-origin support)
     */
    static getCookieConfig(req: Request) {
        const isLocalhost = req.headers.origin?.includes('localhost') || false;
        const isProd = process.env.NODE_ENV === 'production';

        return {
            httpOnly: true,
            sameSite: isLocalhost ? 'lax' as const : 'none' as const,
            secure: !isLocalhost,
            domain: isLocalhost ? 'localhost' : undefined,
            maxAge: isProd && !isLocalhost
                ? 5 * 24 * 60 * 60 * 1000  // 5 days for production
                : 24 * 60 * 60 * 1000      // 24 hours for development
        };
    }

    /**
     * Generate and set CSRF token (production only)
     * Returns the generated token or null if localhost
     */
    static generateCsrfToken(req: Request, res: Response): string | null {
        const isLocalhost = req.headers.origin?.includes('localhost') || false;

        if (!isLocalhost) {
            // Generate CSRF token for production
            const csrfToken = crypto.randomBytes(32).toString('hex');
            res.cookie('csrf-token', csrfToken, {
                httpOnly: false,  // Frontend needs to read this
                sameSite: 'none',
                secure: true,
                maxAge: 5 * 24 * 60 * 60 * 1000  // 5 days
            });
            return csrfToken;
        }
        return null;
    }

    /**
     * Clear all authentication cookies
     */
    static clearAuthCookies(req: Request, res: Response): void {
        const config = this.getCookieConfig(req);

        res.clearCookie('session', {
            httpOnly: config.httpOnly,
            secure: config.secure,
            sameSite: config.sameSite,
            domain: config.domain
        });

        // Clear CSRF token if exists
        if (!req.headers.origin?.includes('localhost')) {
            res.clearCookie('csrf-token', {
                httpOnly: false,
                secure: true,
                sameSite: 'none'
            });
        }
    }
}
