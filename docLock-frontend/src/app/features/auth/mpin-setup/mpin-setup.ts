import { Component, inject, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth/auth';
import { EncryptionService } from '../../../core/services/encryption.service';

@Component({
    selector: 'app-mpin-setup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './mpin-setup.html',
    styleUrl: './mpin-setup.css'
})
export class MpinSetupComponent {
    authService = inject(AuthService);

    encryptionService = inject(EncryptionService);

    @Output() close = new EventEmitter<void>();
    @Output() success = new EventEmitter<void>();

    step = signal<'enter' | 'confirm'>('enter');
    mpin = '';
    confirmMpin = '';
    error = signal('');
    isLoading = signal(false);

    // Keypad numbers
    keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, -1, 0, -2]; // -1: empty, -2: backspace

    onKeyPress(key: number) {
        if (this.isLoading()) return;

        if (key === -2) {
            // Backspace
            if (this.step() === 'enter') {
                this.mpin = this.mpin.slice(0, -1);
            } else {
                this.confirmMpin = this.confirmMpin.slice(0, -1);
            }
        } else if (key !== -1) {
            // Number input
            if (this.step() === 'enter') {
                if (this.mpin.length < 4) this.mpin += key;
                if (this.mpin.length === 4) {
                    setTimeout(() => {
                        this.step.set('confirm');
                        this.error.set('');
                    }, 300);
                }
            } else {
                if (this.confirmMpin.length < 4) this.confirmMpin += key;
                if (this.confirmMpin.length === 4) {
                    this.verifyAndSave();
                }
            }
        }
    }

    verifyAndSave() {
        if (this.mpin !== this.confirmMpin) {
            this.error.set('PINs do not match. Try again.');
            this.confirmMpin = '';
            setTimeout(() => {
                this.step.set('enter');
                this.mpin = '';
                this.confirmMpin = '';
                this.error.set('');
            }, 1000);
            return;
        }

        this.saveMpin();
    }

    saveMpin() {
        if (this.mpin === '0000') {
            this.error.set('PIN cannot be 0000.');
            this.confirmMpin = '';
            setTimeout(() => {
                this.step.set('enter');
                this.mpin = '';
                this.confirmMpin = '';
                this.error.set('');
            }, 1000);
            return;
        }

        this.isLoading.set(true);
        const encryptedMpin = this.encryptionService.encrypt(this.mpin);

        this.authService.updateProfile({ mpin: encryptedMpin }).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.success.emit();
            },
            error: (err) => {
                this.isLoading.set(false);
                this.error.set('Failed to update PIN.');
                console.error(err);
            }
        });
    }

    reset() {
        this.step.set('enter');
        this.mpin = '';
        this.confirmMpin = '';
        this.error.set('');
    }

    cancel() {
        this.close.emit();
    }
}
