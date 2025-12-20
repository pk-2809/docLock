import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, finalize } from 'rxjs';

export interface User {
  id: string;
  name: string;
  email?: string;
  mobile?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  // Reactive State
  // We trust the browser's cookie jar.
  readonly user = signal<User | null>(null);
  readonly isLoading = signal<boolean>(true);

  // Computed Values
  readonly isAuthenticated = computed(() => !!this.user());

  constructor() {
    // Initial content check is done via APP_INITIALIZER
  }

  /**
   * Checks if the user has a valid HTTP-Only cookie session.
   */
  checkSession(): Observable<User | null> {
    this.isLoading.set(true);
    this.setUser();

    return this.http.get<User>('/api/auth/session').pipe(
      tap(user => {
        this.user.set(user);
      }),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  setUser() {
    const user = {
      id: 'eu39e39ei03e3e3',
      name: 'Pranav',
      email: 'pranav@gmail.com',
      mobile: '9839839483'
    }
    this.user.set(user);
  }

  /**
   * Logs in the user.
   * The backend should set the HttpOnly cookie in the response.
   */
  login(mobile: string, mpin: string): Observable<User> {
    this.isLoading.set(true);

    return this.http.post<User>('/api/auth/login', { mobile, mpin }).pipe(
      tap(user => {
        this.user.set(user);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  /**
   * Logs out the user.
   * The backend should clear the HttpOnly cookie.
   */
  logout(): Observable<void> {
    this.isLoading.set(true);

    return this.http.post<void>('/api/auth/logout', {}).pipe(
      tap(() => {
        this.user.set(null);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }
}
