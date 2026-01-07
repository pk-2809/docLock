import { Component, signal, inject, ViewChild, ElementRef, type OnInit, type AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, type NavigationExtras } from '@angular/router';
import { OtpComponent } from '../otp/otp.component';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import { NotificationService } from '../../../core/services/notification.service';
import type { RecaptchaVerifier } from 'firebase/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, OtpComponent],
    templateUrl: './login.html',
    styleUrl: './login.css'
})
export class LoginComponent implements OnInit, AfterViewInit {
    readonly authService = inject(AuthService); // Public by default
    private readonly router = inject(Router);
    private readonly toast = inject(ToastService);
    private readonly notificationService = inject(NotificationService);

    // Standard properties for ngModel
    mobileNumber = '';
    showOtp = false;
    readonly currentText = signal<string>('');

    private recaptchaVerifier: RecaptchaVerifier | null = null;

    // Typewriter properties
    private readonly phrases = ['GO PAPERLESS', 'ONE SCAN ACCESS', 'STAY SECURE.'] as const;
    private phraseIndex = 0;
    private charIndex = 0;
    private isDeleting = false;
    private readonly typingSpeed = 100;
    private readonly deletingSpeed = 50;
    private readonly pauseBetween = 2000;

    ngOnInit(): void {
        this.typeEffect();

        // Check for passed state from Signup (existing user redirection)
        const nav = this.router.getCurrentNavigation();
        const state = nav?.extras?.state as { mobile: string } | undefined;
        if (state?.mobile) {
            this.mobileNumber = state.mobile;
            this.toast.show('Welcome back! Please login.', 'info');
        }
    }

    ngAfterViewInit(): void {
        // Initialize Recaptcha
        setTimeout(() => {
            this.recaptchaVerifier = this.authService.initRecaptcha('recaptcha-container');
        }, 1000);
    }

    private typeEffect(): void {
        const currentPhrase = this.phrases[this.phraseIndex];

        if (this.isDeleting) {
            this.charIndex--;
            this.currentText.set(currentPhrase.substring(0, this.charIndex));
        } else {
            this.charIndex++;
            this.currentText.set(currentPhrase.substring(0, this.charIndex));
        }

        let delta = this.isDeleting ? this.deletingSpeed : this.typingSpeed;

        if (!this.isDeleting && this.charIndex === currentPhrase.length) {
            delta = this.pauseBetween;
            this.isDeleting = true;
        } else if (this.isDeleting && this.charIndex === 0) {
            this.isDeleting = false;
            this.phraseIndex = (this.phraseIndex + 1) % this.phrases.length;
            delta = 500;
        }

        setTimeout(() => this.typeEffect(), delta);
    }

    onMobileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        // Enforce numeric input only
        input.value = input.value.replace(/[^0-9]/g, '');
        this.mobileNumber = input.value;
    }

    onLogin(): void {
        const mobile = this.mobileNumber;

        if (mobile.length !== 10) {
            return;
        }

        setTimeout(() => this.authService.isLoading.set(true), 0);

        // 1. Check if user exists
        this.authService.checkUser(mobile).subscribe({
            next: async (res) => {
                if (res.exists) {
                    // User exists -> Login Flow -> Trigger OTP
                    try {
                        if (!this.recaptchaVerifier) {
                            this.recaptchaVerifier = this.authService.initRecaptcha('recaptcha-container');
                            // Wait longer for reCAPTCHA to fully initialize
                            await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
                        }

                        if (!this.recaptchaVerifier) {
                            throw new Error('reCAPTCHA verifier could not be initialized. Please refresh the page.');
                        }

                        console.log('🚀 Triggering OTP...');
                        await this.authService.triggerOtp(mobile, this.recaptchaVerifier);
                        this.showOtp = true;
                        this.toast.showSuccess('OTP sent successfully! Check your phone.');
                    } catch (err: unknown) {
                        console.error('❌ OTP Error', err);
                        const errorMessage = err instanceof Error ? err.message : 'Failed to send OTP. Please try again.';
                        this.toast.showError(errorMessage);
                    }
                } else {
                    // User New -> Signup Flow
                    // Navigate to Signup with State
                    const navigationExtras: NavigationExtras = {
                        state: { mobile, key: res.key }
                    };
                    this.router.navigate(['/signup'], navigationExtras);
                    this.toast.show('Please create an account to continue.', 'info');
                }
                setTimeout(() => this.authService.isLoading.set(false), 0);
            },
            error: (err) => {
                console.error('Check User Failed', err);
                this.toast.showError('Connection failed. Please check your internet.');
                this.toast.showError('Connection failed. Please check your internet.');
                setTimeout(() => this.authService.isLoading.set(false), 0);
            }
        });
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
        setTimeout(() => this.authService.isLoading.set(true), 0); // Show loading immediately (deferred to avoid NG0100)
        try {
            // 1. Verify OTP with Firebase
            const idToken = await this.authService.verifyOtp(code);

            // 2. Complete Login with Backend
            this.authService.completeLogin(idToken).subscribe({
                next: () => {
                    this.showOtp = false;
                    this.toast.showSuccess('Welcome back!');

                    // Fetch notifications then navigate
                    this.notificationService.fetchNotifications().subscribe({
                        next: () => this.router.navigate(['/dashboard']),
                        error: () => this.router.navigate(['/dashboard']) // Navigate even if fetch fails
                    });
                },
                error: (err) => {
                    console.error('Backend Login Failed', err);
                    const errorMessage = err?.error?.error || 'Login failed. Please try again.';
                    this.toast.showError(errorMessage);
                    setTimeout(() => this.authService.isLoading.set(false), 0); // Reset loading
                    this.otpComponent.triggerError();
                }
            });
        } catch (error) {
            console.error('OTP Verification Error', error);
            const errorMessage = error instanceof Error ? error.message : 'Invalid OTP. Please try again.';
            this.toast.showError(errorMessage);
            this.toast.showError(errorMessage);
            setTimeout(() => this.authService.isLoading.set(false), 0); // Reset loading
            this.otpComponent.triggerError();
            this.otpComponent.triggerError();
        }
    }
}

