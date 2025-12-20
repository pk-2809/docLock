import { HttpInterceptorFn, HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    // 1. Always send cookies/credentials with requests
    const authReq = req.clone({
        withCredentials: true
    });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            // 2. Global Error Handling
            if (error.status === HttpStatusCode.Unauthorized || error.status === HttpStatusCode.Forbidden) {
                // If we get a 401/403, the session is likely invalid.
                // In a real app, this might trigger a refresh token flow first.
                // For now, we redirect to login (unless we are already there).

                if (!router.url.includes('/login')) {
                    router.navigate(['/login']);
                }
            }
            return throwError(() => error);
        })
    );
};
