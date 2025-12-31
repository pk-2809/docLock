import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class EncryptionService {
    // In a real app, this should be a user-specific key (e.g. derived from MPIN) 
    // or a key negotiated with the server. For now, we use a static app-level key
    // to prevent network/db visibility.
    private readonly secretKey = environment.encryptionKey || 'doclock-secure-vault-key-2024';

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
