import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OtpComponent } from '../otp/otp.component';
import { AuthService } from '../../../core/auth/auth';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, OtpComponent],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class LoginComponent {
    private authService = inject(AuthService);
    private router = inject(Router);

    mobileNumber = '';
    showOtp = false;

    // Typewriter properties
    currentText = signal('');
    private phrases = ['GO PAPERLESS', 'ONE SCAN ACCESS', 'STAY SECURE.'];
    private phraseIndex = 0;
    private charIndex = 0;
    private isDeleting = false;
    private typingSpeed = 100;
    private deletingSpeed = 50;
    private pauseBetween = 2000;

    ngOnInit() {
        this.typeEffect();
    }

    typeEffect() {
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

    onMobileInput(event: any) {
        // Enforce numeric input only
        const input = event.target;
        input.value = input.value.replace(/[^0-9]/g, '');
        this.mobileNumber = input.value;
    }

    onLogin() {
        if (this.mobileNumber.length === 10) {
            console.log('OTP Request', { mobile: this.mobileNumber });
            this.showOtp = true;
        }
    }

    onOtpClose() {
        this.showOtp = false;
    }

    onOtpVerify(code: string) {
        // Here we simulate the login via our AuthService
        // The service simulates an API call which would set the cookie
        this.authService.login(this.mobileNumber, code).subscribe({
            next: (user) => {
                console.log('Login successful', user);
                this.showOtp = false;
                this.router.navigate(['/dashboard']);
            },
            error: (err) => {
                console.error('Login failed', err);
                // Handle error (show toast, etc)
            }
        });
    }
}
