import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AppConfig {
    maxStorageLimit: number;
    maxDebitCardsLimit: number;
    maxCreditCardsLimit: number;
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
    private apiUrl = `${environment.apiUrl}/api/config`;

    // Signal to hold the config
    readonly config = signal<AppConfig>(DEFAULT_CONFIG);
    readonly isLoaded = signal<boolean>(false);

    async loadConfig(): Promise<void> {
        try {
            console.log('Fetching App Config...');
            const config = await firstValueFrom(this.http.get<AppConfig>(this.apiUrl, { withCredentials: true }));
            if (config) {
                this.config.set(config);
                this.isLoaded.set(true);
                console.log('✅ App Config Loaded:', config);
            }
        } catch (error) {
            console.error('❌ Failed to load App Config, using defaults:', error);
            // We keep defaults, but log error
        }
    }
}
