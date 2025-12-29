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

    friendToConfirm = signal<{ uid: string, name: string, profileImage?: string | null } | null>(null);
    showConfirmation = signal(false);

    // Regex for: http(s)://domain/profile/USERID
    private urlRegex = /^https?:\/\/[^\/]+\/profile\/[A-Za-z0-9]+$/;

    isValidInput(): boolean {
        const input = this.profileUrl.trim();
        // Allow URL matching regex OR simple alphanumeric string (User ID)
        // User IDs are typically alphanumeric, around 28 chars for Firebase, but let's be flexible
        return input.length > 0 && (this.urlRegex.test(input) || /^[A-Za-z0-9]+$/.test(input));
    }

    initiateAddFriend() {
        if (!this.profileUrl.trim() || !this.isValidInput()) return;

        this.error.set('');
        this.success.set('');

        const userId = this.extractUserId(this.profileUrl);

        if (!userId) {
            this.error.set('Invalid ID or URL. Please check your input.');
            return;
        }

        // 1. Check if already friend
        const isAlreadyFriend = this.peopleService.friends().some(f => f.uid === userId);
        if (isAlreadyFriend) {
            this.error.set('This user is already in your circle! 🌟');
            return;
        }

        this.isLoading.set(true);

        // 2. Get Public Profile
        this.peopleService.getPublicProfile(userId).subscribe({
            next: (profile: any) => {
                this.isLoading.set(false);
                this.friendToConfirm.set(profile);
                this.showConfirmation.set(true);
            },
            error: (err) => {
                this.isLoading.set(false);
                this.error.set(err.error?.error || 'User not found. Please check the ID.');
            }
        });
    }

    confirmAdd() {
        const friend = this.friendToConfirm();
        if (!friend) return;

        // Close sheet (optional, but good UX to show loading elsewhere? Or keep sheet open?)
        // Let's close sheet and show loading on main button or keep sheet open with loading?
        // Current design: sheet usually handles its own state or emits event.
        // User wants "Let's Connect" button on sheet.

        this.showConfirmation.set(false); // Close sheet first?
        this.isLoading.set(true); // Main page loading

        this.peopleService.addFriend(friend.uid).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.success.set('Friend added successfully!');
                this.toastService.showSuccess('Friend added successfully!');
                this.profileUrl = '';
                this.friendToConfirm.set(null);
                setTimeout(() => this.router.navigate(['/friends']), 1500);
            },
            error: (err) => {
                this.isLoading.set(false);
                const errorMsg = err.error?.error || 'Failed to add friend.';
                this.error.set(errorMsg);
                this.toastService.showError(errorMsg);
            }
        });
    }

    closeConfirmation() {
        this.showConfirmation.set(false);
        this.friendToConfirm.set(null);
    }

    private extractUserId(input: string): string | null {
        try {
            let cleanInput = input.trim();
            // If it looks like a URL, try to extract from last segment
            if (cleanInput.includes('/profile/')) {
                if (cleanInput.endsWith('/')) {
                    cleanInput = cleanInput.slice(0, -1);
                }
                const parts = cleanInput.split('/');
                return parts[parts.length - 1];
            }
            // Otherwise assume it is the ID itself
            return cleanInput;
        } catch {
            return null;
        }
    }
}
