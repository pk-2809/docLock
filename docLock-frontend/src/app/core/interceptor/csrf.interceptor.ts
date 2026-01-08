import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth';

/**
 * CSRF Interceptor
 * Adds CSRF token to state-changing requests for production security
 */
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    // Get CSRF token from AuthService (received from backend)
    const csrfToken = authService.csrfToken;

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
