import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AppSettingsService {

    public get apiUrl(): string {
        return environment.apiUrl;
    }

    public get firebaseConfig() {
        return environment.firebaseConfig;
    }

    public get encryptionKey(): string {
        return environment.encryptionKey;
    }
}
