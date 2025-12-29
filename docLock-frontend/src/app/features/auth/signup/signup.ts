import { Component, inject, signal, ViewChild, type OnInit, type AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, type NavigationExtras } from '@angular/router';
import { OtpComponent } from '../otp/otp.component';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../../core/services/notification.service';
import type { RecaptchaVerifier } from 'firebase/auth';

interface RouterState {
    mobile: string;
    key: string;
}

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, OtpComponent],
    templateUrl: './signup.html',
    styleUrls: ['./signup.css']
})
export class SignupComponent implements OnInit, AfterViewInit {
    readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly notificationService = inject(NotificationService);

    // Form properties (for ngModel binding)
    name = '';
    mobileNumber = '';

    // Signals for reactive state
    signupKey = '';
    showOtp = false;

    private recaptchaVerifier: RecaptchaVerifier | null = null;

    ngOnInit(): void {
        // Get state from router navigation
        const nav = this.router.getCurrentNavigation();
        const state = nav?.extras?.state as RouterState | undefined;

        if (state?.mobile && state?.key) {
            this.mobileNumber = state.mobile;
            this.signupKey = state.key;
        }
    }

    ngAfterViewInit(): void {
        this.recaptchaVerifier =
            this.authService.initRecaptcha('signup-recaptcha-container');

        if (!this.recaptchaVerifier) {
            console.error('❌ reCAPTCHA failed to initialize');
        }
    }

    onMobileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        // Enforce numeric input only
        input.value = input.value.replace(/[^0-9]/g, '');
        this.mobileNumber = input.value;
    }

    async onSignup(): Promise<void> {
        const mobile = this.mobileNumber;
        const name = this.name;

        if (mobile.length !== 10 || !name.trim()) {
            return;
        }

        this.authService.isLoading.set(true);

        try {
            // If signup key is missing, fetch it from backend
            const currentKey = this.signupKey;
            if (!currentKey) {
                this.authService.checkUser(mobile).subscribe({
                    next: (res) => {
                        if (res.exists) {
                            this.toast.showError('User already exists. Please login instead.');
                            this.authService.isLoading.set(false);
                            this.router.navigate(['/login']);
                        } else if (res.key) {
                            this.signupKey = res.key;
                            // Now trigger OTP with the key
                            this.triggerOtpWithKey();
                        } else {
                            this.toast.showError('Failed to get signup authorization. Please try again.');
                            this.authService.isLoading.set(false);
                        }
                    },
                    error: (err) => {
                        console.error('Check User Failed', err);
                        this.toast.showError('Connection failed. Please check your internet.');
                        this.authService.isLoading.set(false);
                    }
                });
            } else {
                // Key exists, proceed with OTP
                await this.triggerOtpWithKey();
            }
        } catch (err) {
            console.error('Signup OTP Error', err);
            this.toast.showError('Failed to send OTP. Please try again.');
            this.authService.isLoading.set(false);
        }
    }

    private async triggerOtpWithKey(): Promise<void> {
        try {

            if (!this.recaptchaVerifier) {
                this.toast.showError('Security check not ready. Please wait a moment.');
                throw new Error('reCAPTCHA not ready. Please refresh the page.');
            }

            // Trigger OTP
            const mobile = this.mobileNumber;
            console.log('🚀 Triggering OTP for signup...');
            await this.authService.triggerOtp(mobile, this.recaptchaVerifier);
            this.showOtp = true;
            this.toast.showSuccess('OTP sent successfully! Check your phone.');
        } catch (err: unknown) {
            console.error('❌ OTP Trigger Error', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.';
            this.toast.showError(errorMessage);
        } finally {
            this.authService.isLoading.set(false);
        }
    }

    onOtpClose(): void {
        this.showOtp = false;
    }

    @ViewChild(OtpComponent) otpComponent!: OtpComponent;

    async onGetOtp(): Promise<void> {
        if (!this.mobileNumber || !this.recaptchaVerifier) return;

        this.otpComponent.initiateResend();

        try {
            await this.authService.triggerOtp(this.mobileNumber, this.recaptchaVerifier);
            this.toast.showSuccess('OTP resent successfully!');
            this.otpComponent.finalizeResend(true);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to resend OTP.';
            this.toast.showError(errorMessage);
            this.otpComponent.finalizeResend(false);
        }
    }

    async onOtpVerify(code: string): Promise<void> {
        // Ensure we have a signup key before proceeding
        if (!this.signupKey) return;

        this.authService.isLoading.set(true); // Show loading immediately

        try {
            // 1. Verify OTP with Firebase
            const idToken = await this.authService.verifyOtp(code);

            // 2. Complete Signup with Backend
            this.authService.completeSignup(this.name, idToken, this.signupKey).subscribe({
                next: () => {
                    this.showOtp = false;
                    this.toast.showSuccess('Account created successfully!');

                    // Fetch notifications then navigate
                    this.notificationService.fetchNotifications().subscribe({
                        next: () => this.router.navigate(['/dashboard']),
                        error: () => this.router.navigate(['/dashboard'])
                    });
                },
                error: (err) => {
                    console.error('Signup Failed', err);
                    const errorMessage = err?.error?.error || 'Signup failed. Please try again.';
                    this.toast.showError(errorMessage);
                    this.authService.isLoading.set(false); // Reset loading
                    this.otpComponent.triggerError();
                }
            });
        } catch (error) {
            console.error('OTP Verification Error', error);
            const errorMessage = error instanceof Error ? error.message : 'Invalid OTP. Please try again.';
            this.toast.showError(errorMessage);
            this.authService.isLoading.set(false); // Reset loading
            this.otpComponent.triggerError();
        }
    }
}

