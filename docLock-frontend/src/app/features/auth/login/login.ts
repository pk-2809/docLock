import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OtpComponent } from '../otp/otp.component';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, OtpComponent],
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class LoginComponent {
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

    constructor(private router: Router) { }

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
        console.log('OTP Verified:', code);
        this.showOtp = false;
        this.router.navigate(['/dashboard']);
    }
}
