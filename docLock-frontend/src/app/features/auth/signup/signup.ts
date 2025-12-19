import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { OtpComponent } from '../otp/otp.component';

@Component({
    selector: 'app-signup',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, OtpComponent],
    templateUrl: './signup.html',
    styleUrls: ['./signup.css']
})
export class SignupComponent {
    name = '';
    mobileNumber = '';
    showOtp = false;

    constructor(private router: Router) { }

    onMobileInput(event: any) {
        // Enforce numeric input only
        const input = event.target;
        input.value = input.value.replace(/[^0-9]/g, '');
        this.mobileNumber = input.value;
    }

    onSignup() {
        if (this.mobileNumber.length === 10 && this.name) {
            console.log('Signup OTP Request', { name: this.name, mobile: this.mobileNumber });
            // Simulate OTP flow
            this.showOtp = true;
        }
    }

    onOtpClose() {
        this.showOtp = false;
    }

    onOtpVerify(code: string) {
        console.log('Signup OTP Verified:', code);
        this.showOtp = false;
        // Proceed to setup or dashboard
        this.router.navigate(['/auth/setup']);
    }
}
