import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppSettingsService } from '../services/app-settings.service';
import { AES, enc } from 'crypto-js';

export interface AppConfig {
    maxStorageLimit: number;
    maxDebitCardsLimit: number;
    maxCreditCardsLimit: number;
    maxQrLimit: number; // New Limit
    maxFolderNestingAllowed: number;
    sharedDocumentLifeInHrs: number;
    maxFriendsAddLimit: number;
    maxPdfSizeAllowed: number;
    maxImgSizeAllowed: number;
    imgFormatsAllowed: string[];
    otherFormatsAllowed: string[];
}

const DEFAULT_CONFIG: AppConfig = {
    maxStorageLimit: 200 * 1024 * 1024,
    maxDebitCardsLimit: 5,
    maxCreditCardsLimit: 5,
    maxQrLimit: 5,
    maxFolderNestingAllowed: 5,
    sharedDocumentLifeInHrs: 1,
    maxFriendsAddLimit: 10,
    maxPdfSizeAllowed: 5 * 1024 * 1024,
    maxImgSizeAllowed: 2 * 1024 * 1024,
    imgFormatsAllowed: ['.jpg', '.jpeg', '.png', '.heic', '.avif'],
    otherFormatsAllowed: ['.pdf', '.docx', '.doc']
};

@Injectable({
    providedIn: 'root'
})
export class AppConfigService {
    private http = inject(HttpClient);
    private appSettings = inject(AppSettingsService);
    private apiUrl = `${this.appSettings.apiUrl}/api/config`;

    // Secure Storage Key (Obfuscation only, not military-grade)
    private readonly STORAGE_KEY = 'enc_app_cfg';
    private readonly SECRET_KEY = 'DOCLOCK_SECURE_CFG_KEY';

    readonly config = signal<AppConfig>(DEFAULT_CONFIG);
    readonly isLoaded = signal<boolean>(false);

    private loadingPromise: Promise<void> | null = null;

    async loadConfig(): Promise<void> {
        // 1. Try to load from Cache first
        if (this.loadFromCache()) {
            return;
        }

        // 2. Return existing promise if already loading
        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        // 3. If no cache, fetch from API
        this.loadingPromise = (async () => {
            try {
                console.log('Fetching App Config from network...');
                const config = await firstValueFrom(this.http.get<AppConfig>(this.apiUrl, { withCredentials: true }));
                if (config) {
                    const fullConfig = { ...DEFAULT_CONFIG, ...config };
                    this.config.set(fullConfig);
                    this.isLoaded.set(true);
                    this.saveToCache(fullConfig); // Encrypt and Save
                    console.log('✅ App Config Loaded (Network)');
                }
            } catch (error: any) {
                // 401 is expected when user is not logged in - don't spam console
                if (error?.status !== 401) {
                    console.error('❌ Failed to load App Config, using defaults:', error);
                }
                // Always fall back to defaults
                this.config.set(DEFAULT_CONFIG);
                this.isLoaded.set(true);
            } finally {
                this.loadingPromise = null;
            }
        })();

        return this.loadingPromise;
    }

    private loadFromCache(): boolean {
        try {
            const encryptedData = sessionStorage.getItem(this.STORAGE_KEY);
            if (!encryptedData) return false;

            const bytes = AES.decrypt(encryptedData, this.SECRET_KEY);
            const decryptedData = JSON.parse(bytes.toString(enc.Utf8));

            if (decryptedData) {
                // Merge with DEFAULT_CONFIG to ensure new new fields (like imgFormatsAllowed) are present if missing in cache
                this.config.set({ ...DEFAULT_CONFIG, ...decryptedData });
                this.isLoaded.set(true);
                console.log('⚡️ App Config Loaded (Secure Session Cache)');
                return true;
            }
        } catch (e) {
            console.warn('Cache decryption failed, fetching fresh config.');
            sessionStorage.removeItem(this.STORAGE_KEY); // Clear corrupted cache
        }
        return false;
    }

    private saveToCache(data: AppConfig): void {
        try {
            const encryptedData = AES.encrypt(JSON.stringify(data), this.SECRET_KEY).toString();
            sessionStorage.setItem(this.STORAGE_KEY, encryptedData);
        } catch (e) {
            console.error('Failed to save config to cache', e);
        }
    }

    clearCache(): void {
        try {
            sessionStorage.removeItem(this.STORAGE_KEY);
            this.config.set(DEFAULT_CONFIG);
            this.isLoaded.set(false);
            console.log('✅ App Config Session Cache Cleared');
        } catch (e) {
            console.error('Failed to clear config cache', e);
        }
    }
}
