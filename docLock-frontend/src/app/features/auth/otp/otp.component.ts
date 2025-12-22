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

    @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

    otp: string[] = ['', '', '', '', '', ''];

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
            // Auto-focus first input when opened
            this.otp = ['', '', '', '', '', '']; // Reset
            setTimeout(() => {
                this.focusInput(0);
            }, 100);
        }
    }

    // Handle Input Event (Value Entry)
    onInput(index: number, event: Event) {
        if (this.isLoading) return;

        const input = event.target as HTMLInputElement;
        const value = input.value;

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
            this.close.emit();
        }
    }
}
