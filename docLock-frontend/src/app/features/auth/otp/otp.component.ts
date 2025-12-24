import { Component, EventEmitter, Input, Output, QueryList, ViewChildren, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-otp',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './otp.component.html',
    styleUrls: ['./otp.component.css']
})
export class OtpComponent implements OnChanges {
    @Input() isOpen = false;
    @Input() email = '';
    @Input() isLoading = false; // Controlled by Parent
    @Output() close = new EventEmitter<void>();
    @Output() verify = new EventEmitter<string>();
    @Output() resend = new EventEmitter<void>();

    @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

    get maskedLabel(): string {
        if (!this.email) return 'your number';
        if (this.email.includes('@')) return this.email; // Fallback for email if used
        // Mask mobile: +91 ******1234
        // Assuming format might be +919876543210 or 9876543210
        const clean = this.email.replace(/[^0-9]/g, '');
        const last4 = clean.slice(-4);
        return `******${last4}`;
    }

    otp: string[] = ['', '', '', '', '', ''];

    // Resend Logic
    resendTimer = 30; // seconds
    canResend = false;
    resendAttempts = 0;
    maxResendAttempts = 3;
    intervalId: any;

    // UI State
    isError = false;
    isResending = false;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
            // Reset everything on open
            this.otp = ['', '', '', '', '', ''];
            this.startTimer();
            setTimeout(() => {
                this.focusInput(0);
            }, 100);
        } else {
            this.stopTimer();
        }
    }

    ngOnDestroy() {
        this.stopTimer();
    }

    startTimer() {
        this.resendTimer = 30;
        this.canResend = false;
        this.stopTimer(); // clear existing

        this.intervalId = setInterval(() => {
            if (this.resendTimer > 0) {
                this.resendTimer--;
            } else {
                this.canResend = true;
                this.stopTimer();
            }
        }, 1000);
    }

    stopTimer() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    // Handle Input Event (Value Entry)
    onInput(index: number, event: Event) {
        if (this.isLoading) return;

        // Clear Error on Typing
        if (this.isError) {
            this.isError = false;
        }

        const input = event.target as HTMLInputElement;
        const value = input.value;

        // ... (rest of onInput)

        // Reset input value to avoid double chars if Angular cycle is slow
        input.value = '';

        if (!value) return;

        // Handle Paste or Single Char
        const chars = value.split('');

        let currentIndex = index;
        for (const char of chars) {
            if (currentIndex < 6) {
                this.otp[currentIndex] = char;
                currentIndex++;
            }
        }

        // Check if complete
        if (this.otp.every(digit => digit !== '')) {
            this.otpInputs.get(5)?.nativeElement.blur(); // Remove focus
            this.onVerify();
            return;
        }

        // Move Focus to next available
        if (currentIndex < 6) {
            this.focusInput(currentIndex);
        } else {
            this.focusInput(5);
        }
    }

    // Handle KeyDown Event (Navigation & Backspace)
    onKeyDown(index: number, event: KeyboardEvent) {
        if (this.isLoading) return;

        const input = event.target as HTMLInputElement;

        if (event.key === 'Backspace') {
            event.preventDefault(); // Take full control

            if (this.otp[index]) {
                // If current index has value, clear it
                this.otp[index] = '';
            } else {
                // If empty, move prev AND clear prev (standard behavior)
                if (index > 0) {
                    this.focusInput(index - 1);
                    this.otp[index - 1] = '';
                }
            }
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            if (index > 0) this.focusInput(index - 1);
            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            if (index < 5) this.focusInput(index + 1);
            return;
        }
    }

    // Helper to focus input safely
    private focusInput(index: number) {
        const input = this.otpInputs.get(index)?.nativeElement;
        input?.focus();
    }

    onVerify() {
        const code = this.otp.join('');
        if (code.length === 6) {
            this.verify.emit(code);
        }
    }

    onClose() {
        if (!this.isLoading) {
            this.stopTimer();
            this.close.emit();
        }
    }

    onResend() {
        if (this.canResend && this.resendAttempts < this.maxResendAttempts) {
            this.initiateResend();
            this.resend.emit();
        }
    }

    // Public Control Methods (Called by Parent)
    triggerError() {
        this.isError = true;
        this.otp = ['', '', '', '', '', '']; // Clear OTP
        setTimeout(() => this.focusInput(0), 100);
    }

    initiateResend() {
        this.isResending = true;
    }

    finalizeResend(success: boolean) {
        this.isResending = false;
        if (success) {
            this.resendAttempts++;
            this.startTimer();
            // Clear inputs
            this.otp = ['', '', '', '', '', ''];
            this.focusInput(0);
        }
    }
}
