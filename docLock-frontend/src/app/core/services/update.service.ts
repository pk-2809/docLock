import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, interval } from 'rxjs';
import { ToastService } from './toast.service';

@Injectable({
    providedIn: 'root'
})
export class UpdateService {
    private swUpdate = inject(SwUpdate);
    private toastService = inject(ToastService);

    // Poll every 60 seconds
    private readonly POLLING_INTERVAL = 60 * 1000;

    constructor() { }

    init() {
        if (!this.swUpdate.isEnabled) {
            console.log('[UpdateService] Service Worker is not enabled. Skipping update checks.');
            return;
        }

        console.log('[UpdateService] Initialized. Starting update checks.');

        // 1. Subscribe to version updates
        this.swUpdate.versionUpdates
            .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
            .subscribe(() => {
                console.log('[UpdateService] New version ready.');
                this.promptUser();
            });

        // 2. Start polling for updates
        this.startPolling();
    }

    private startPolling() {
        // Check immediately
        this.checkForUpdate();

        // Check periodically
        interval(this.POLLING_INTERVAL).subscribe(() => {
            this.checkForUpdate();
        });
    }

    private async checkForUpdate() {
        try {
            console.log('[UpdateService] Checking for updates...');
            const updateFound = await this.swUpdate.checkForUpdate();
            console.log(`[UpdateService] Update found: ${updateFound}`);
        } catch (err) {
            console.error('[UpdateService] Failed to check for updates:', err);
        }
    }

    private promptUser() {
        // Force a simpler, reliable confirmation.
        // In a real PWA, you might show a permanent banner, but confirm() is "bulletproof" for visibility.
        if (confirm('A new version of DocLock is available. Update now to get the latest features?')) {
            this.swUpdate.activateUpdate().then(() => window.location.reload());
        }
    }
}
