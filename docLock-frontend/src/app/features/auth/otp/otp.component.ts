import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-otp',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './otp.component.html',
    styleUrls: ['./otp.component.css']
})
export class OtpComponent {
    @Input() isOpen = false;
    @Input() email = '';
    @Output() close = new EventEmitter<void>();
    @Output() verify = new EventEmitter<string>();

    otp: string[] = ['', '', '', '', '', ''];

    onInput(index: number, event: any) {
        const value = event.target.value;

        // Handle paste
        if (value.length > 1) {
            const chars = value.split('').slice(0, 6);
            chars.forEach((char: string, i: number) => {
                if (index + i < 6) {
                    this.otp[index + i] = char;
                }
            });
            return;
        }

        this.otp[index] = value;

        // Move to next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    }

    onKeyDown(index: number, event: KeyboardEvent) {
        // Move to previous input on backspace
        if (event.key === 'Backspace' && !this.otp[index] && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    }

    onVerify() {
        const code = this.otp.join('');
        if (code.length === 6) {
            this.verify.emit(code);
        }
    }

    onClose() {
        this.close.emit();
    }
}
