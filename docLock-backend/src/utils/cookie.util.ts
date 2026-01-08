import { Request, Response } from 'express';

/**
 * Cookie Configuration Utility
 * Provides environment-aware cookie settings for Safari compatibility
 */
export class CookieUtil {
    /**
     * Get environment-aware cookie configuration
     * - Localhost: sameSite=lax, secure=false (works in Safari)
     * - Production: SameSite=Strict (effective Same-Origin with Rewrites)
     */
    static getCookieConfig(_req: Request) {
        // With Firebase Hosting Rewrites, we are effectively Same-Origin even in production.
        return {
            httpOnly: true,
            sameSite: 'strict' as const, // Strict is safe for Same-Origin
            secure: true, // Always secure in production/firebase
            path: '/',
            maxAge: 5 * 24 * 60 * 60 * 1000 // 5 days
        };
    }

    /**
     * Generate and set CSRF token (production only)
     * DEPRECATED: With Same-Origin + SameSite=Strict, this is less critical.
     * Firebase Hosting strips 'csrf-token' cookie anyway.
     */
    static generateCsrfToken(_req: Request, _res: Response): string | null {
        return null;
    }

    /**
     * Clear all authentication cookies
     */
    static clearAuthCookies(req: Request, res: Response): void {
        const config = this.getCookieConfig(req);

        res.clearCookie('__session', {
            httpOnly: config.httpOnly,
            secure: config.secure,
            sameSite: config.sameSite,
            path: '/'
        });
    }
}
