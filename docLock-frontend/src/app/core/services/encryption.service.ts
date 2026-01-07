import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { AppSettingsService } from '../services/app-settings.service';

@Injectable({
    providedIn: 'root'
})
export class EncryptionService {
    private readonly secretKey = new AppSettingsService().encryptionKey;

    encrypt(value: string): string {
        if (!value) return '';
        return CryptoJS.AES.encrypt(value, this.secretKey).toString();
    }

    decrypt(encryptedValue: string): string {
        if (!encryptedValue) return '';
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedValue, this.secretKey);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            console.error('Decryption failed', e);
            return '';
        }
    }

    generateHmac(value: string): string {
        if (!value) return '';
        return CryptoJS.HmacSHA256(value, this.secretKey).toString(CryptoJS.enc.Hex);
    }
}
