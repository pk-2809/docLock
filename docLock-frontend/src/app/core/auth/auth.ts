import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, of, finalize, map, switchMap, throwError } from 'rxjs';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, Auth } from 'firebase/auth';
import { firebaseAuth } from './firebase';
import { environment } from '../../../environments/environment';

export interface User {
  uid: string;
  name?: string;
  mobile?: string;
  role?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);

  private auth = firebaseAuth;
  private confirmationResult: ConfirmationResult | undefined;
  private apiUrl = `${environment.apiUrl}/api/auth`;

  // Reactive State
  readonly user = signal<User | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly isAuthenticated = computed(() => !!this.user());

  constructor() {
    this.auth.languageCode = 'en';
    this.checkSession().subscribe();
  }

  initRecaptcha(elementId: string): RecaptchaVerifier | null {
    if (!this.auth) {
      console.error('Firebase Auth not initialized');
      return null;
    }

    try {
      // Wait a bit to ensure DOM is ready
      const container = document.getElementById(elementId);
      if (!container) {
        console.error(`❌ reCAPTCHA container not found: ${elementId}`);
        console.error('   Make sure the container exists in the template');
        return null;
      }



      // Clear previous verifier if exists
      container.innerHTML = '';

      // Ensure container is in the DOM (not display: none might cause issues)
      if (container.style.display === 'none') {
        container.style.display = 'block';
        container.style.visibility = 'hidden';
        container.style.position = 'absolute';
        container.style.width = '1px';
        container.style.height = '1px';
      }

      // Create new reCAPTCHA verifier with proper configuration

      const verifier = new RecaptchaVerifier(this.auth, elementId, {
        'size': 'invisible',
        'callback': () => {

        },
        'expired-callback': () => {
          console.warn('⚠️ reCAPTCHA expired - will be re-verified automatically');
        }
      });

      // Render the verifier - this is required even for invisible
      verifier.render().then((widgetId) => {

      }).catch((error) => {
        console.error('❌ reCAPTCHA render error:', error);
        // Still return verifier - it might work despite render error
      });

      return verifier;
    } catch (error) {
      console.error('❌ Error initializing reCAPTCHA verifier:', error);
      if (error instanceof Error) {
        console.error('   Error details:', error.message, error.stack);
      }
      return null;
    }
  }

  /**
   * Step 1: Check if user exists.
   */
  checkUser(mobile: string): Observable<{ exists: boolean; key?: string }> {
    return this.http.post<{ exists: boolean; key?: string }>(`${this.apiUrl}/check-user`, { mobile });
  }

  /**
   * Step 2: Trigger OTP.
   * Returns Promise because Firebase SDK uses Promises.
   */
  async triggerOtp(mobile: string, verifier: RecaptchaVerifier | null): Promise<void> {
    if (!this.auth) {
      throw new Error('Firebase not initialized');
    }
    if (!verifier) {
      throw new Error('reCAPTCHA verifier not initialized');
    }

    const formattedMobile = mobile.startsWith('+') ? mobile : `+91${mobile}`;


    try {
      this.confirmationResult = await signInWithPhoneNumber(this.auth, formattedMobile, verifier);

    } catch (error: unknown) {
      console.error('OTP Trigger Error:', error);

      // Provide more specific error messages
      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };

        switch (firebaseError.code) {
          case 'auth/recaptcha-not-verified':
            throw new Error('reCAPTCHA verification failed. Please refresh and try again.');
          case 'auth/invalid-phone-number':
            throw new Error('Invalid phone number format. Please enter a valid 10-digit number.');
          case 'auth/too-many-requests':
            throw new Error('Too many requests. Please try again later.');
          case 'auth/quota-exceeded':
            throw new Error('SMS quota exceeded. Please try again later.');
          case 'auth/missing-phone-number':
            throw new Error('Phone number is required.');
          case 'auth/invalid-app-credential':
            throw new Error('Invalid app credentials. Please check Firebase configuration.');
          default:
            throw new Error(firebaseError.message || `Failed to send OTP: ${firebaseError.code}`);
        }
      }

      throw error instanceof Error ? error : new Error('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Step 3: Verify OTP and Get ID Token.
   */
  async verifyOtp(code: string): Promise<string> {
    if (!this.confirmationResult) {
      throw new Error('No OTP requested. Please request OTP first.');
    }

    try {
      const result = await this.confirmationResult.confirm(code);
      const idToken = await result.user.getIdToken();
      return idToken;
    } catch (error: unknown) {
      console.error('OTP Verify Error:', error);

      if (error && typeof error === 'object' && 'code' in error) {
        const firebaseError = error as { code: string; message?: string };

        switch (firebaseError.code) {
          case 'auth/invalid-verification-code':
            throw new Error('Invalid OTP code. Please try again.');
          case 'auth/code-expired':
            throw new Error('OTP code has expired. Please request a new one.');
          default:
            throw new Error(firebaseError.message || 'OTP verification failed. Please try again.');
        }
      }

      throw error instanceof Error ? error : new Error('OTP verification failed. Please try again.');
    }
  }

  /**
   * Step 4a: Complete Login (Exchange ID Token for Session)
   */
  completeLogin(idToken: string): Observable<User> {
    this.isLoading.set(true);
    return this.http.post<{ status: string; uid: string }>(`${this.apiUrl}/login-verify`, { idToken }, { withCredentials: true }).pipe(
      switchMap(() => this.checkSession()), // Reload session to get full user details
      catchError(err => {
        this.isLoading.set(false);
        return throwError(() => err);
      }),
      map(user => user!)
    );
  }

  /**
   * Step 4b: Complete Signup (Exchange ID Token + Key + Name for Session)
   */
  completeSignup(name: string, idToken: string, key: string): Observable<User> {
    const url = `${this.apiUrl}/signup`;



    this.isLoading.set(true);
    return this.http.post<{ status: string; uid: string }>(url, { name, idToken, key }, { withCredentials: true }).pipe(
      switchMap(() => this.checkSession()),
      catchError(err => {
        this.isLoading.set(false);
        return throwError(() => err);
      }),
      map(user => user!)
    );
  }

  /**
   * Checks if the user has a valid HTTP-Only cookie session.
   */
  checkSession(): Observable<User | null> {
    return this.http.get<{ isLoggedIn: boolean; user?: User }>(`${this.apiUrl}/session`, { withCredentials: true }).pipe(
      tap(response => {
        if (response.isLoggedIn && response.user) {
          this.user.set(response.user);
        } else {
          this.user.set(null);
        }
      }),
      map(response => response.user || null),
      catchError(() => {
        this.user.set(null);
        return of(null);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  logout(): Observable<void> {
    this.isLoading.set(true);
    return this.http.post<void>(`${this.apiUrl}/logout`, {}, { withCredentials: true }).pipe(
      tap(() => {
        this.user.set(null);
      }),
      finalize(() => {
        this.isLoading.set(false);
      })
    );
  }

  // Legacy/Deprecated methods - kept for backward compatibility
  // TODO: Remove these once all components are migrated
  setUser(): void {
    // Deprecated: Use checkSession() instead
    console.warn('setUser() is deprecated. Use checkSession() instead.');
  }

  login(_mobile: string, _mpin: string): Observable<null> {
    // Deprecated: Use completeLogin() instead
    console.warn('login() is deprecated. Use completeLogin() instead.');
    return of(null);
  }
}
