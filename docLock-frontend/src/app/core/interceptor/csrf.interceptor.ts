import { HttpInterceptorFn } from '@angular/common/http';

/**
 * CSRF Interceptor
 * Adds CSRF token to state-changing requests for production security
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
    // Get CSRF token from cookie
    const csrfToken = getCookie('csrf-token');

    // Add CSRF header to state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && csrfToken) {
        req = req.clone({
            setHeaders: {
                'X-CSRF-Token': csrfToken
            }
        });
    }

    return next(req);
};

/**
 * Helper function to get cookie value by name
 */
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue || null;
    }
    return null;
}
