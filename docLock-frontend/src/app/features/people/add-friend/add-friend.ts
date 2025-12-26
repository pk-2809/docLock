import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeopleService } from '../../../core/people/people.service';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-add-friend',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './add-friend.html',
    styleUrl: './add-friend.css'
})
export class AddFriendComponent {
    private peopleService = inject(PeopleService);
    private router = inject(Router);
    private toastService = inject(ToastService);

    profileUrl = '';
    isLoading = signal(false);
    error = signal('');
    success = signal('');

    // Regex for: http(s)://domain/profile/USERID
    private urlRegex = /^https?:\/\/[^\/]+\/profile\/[A-Za-z0-9]+$/;

    isValidUrl(): boolean {
        return this.urlRegex.test(this.profileUrl.trim());
    }

    addFriend() {
        if (!this.profileUrl.trim() || !this.isValidUrl()) return;

        this.isLoading.set(true);
        this.error.set('');
        this.success.set('');

        const userId = this.extractUserId(this.profileUrl);

        if (!userId) {
            this.error.set('Invalid Profile URL. Please paste a valid link.');
            this.isLoading.set(false);
            return;
        }

        this.peopleService.addFriend(userId).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.success.set('Friend added successfully!');
                this.toastService.showSuccess('Friend added successfully!'); // Toast
                this.profileUrl = '';
                setTimeout(() => this.router.navigate(['/friends']), 1500);
            },
            error: (err) => {
                this.isLoading.set(false);
                const errorMsg = err.error?.error || 'Failed to add friend.';
                this.error.set(errorMsg);
                this.toastService.showError(errorMsg); // Toast
            }
        });
    }

    private extractUserId(url: string): string | null {
        try {
            // Remove trailing slash
            let cleanUrl = url.trim();
            if (cleanUrl.endsWith('/')) {
                cleanUrl = cleanUrl.slice(0, -1);
            }

            // Assume format: .../profile/USER_ID or .../u/USER_ID
            // Or if just ID is pasted
            if (!cleanUrl.includes('/')) return cleanUrl;

            const parts = cleanUrl.split('/');
            return parts[parts.length - 1]; // Get last part
        } catch {
            return null;
        }
    }
}
