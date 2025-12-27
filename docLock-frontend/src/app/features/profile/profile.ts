import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth';
import { ToastService } from '../../core/services/toast.service';

import { MpinSetupComponent } from '../auth/mpin-setup/mpin-setup';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, MpinSetupComponent],
    templateUrl: './profile.html',
    styleUrl: './profile.css'
})
export class ProfileComponent {
    authService = inject(AuthService);
    router = inject(Router);
    toastService = inject(ToastService); // Inject ToastService

    user = this.authService.user;
    isUploading = signal(false);

    // Mock stats
    stats = {
        storageUsed: 65,
        documents: 124,
    };



    // File Upload
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Limit size to 500KB
            if (file.size > 500 * 1024) {
                this.toastService.showError('Image size must be less than 500KB'); // Use Toast
                return;
            }

            this.isUploading.set(true); // Start loading

            const reader = new FileReader();
            reader.onload = () => {
                const base64String = reader.result as string;
                this.updateProfileImage(base64String);
            };
            reader.readAsDataURL(file);
        }
    }

    updateProfileImage(base64Image: string) {
        this.authService.updateProfile({ profileImage: base64Image }).subscribe({
            next: () => {
                // Force session refresh to show new image immediately
                this.authService.checkSession().subscribe(() => {
                    this.isUploading.set(false); // Stop loading
                    this.toastService.showSuccess('Profile updated successfully'); // Success Toast
                });
            },
            error: (err) => {
                console.error('Failed to update profile image', err);
                this.toastService.showError('Failed to update profile image'); // Error Toast
                this.isUploading.set(false); // Stop loading
            }
        });
    }

    copyProfileLink() {
        const userId = this.user()?.uid;
        if (!userId) return;

        navigator.clipboard.writeText(userId).then(() => {
            this.toastService.showSuccess('Profile ID copied to clipboard!'); // Success Toast
        }).catch(err => {
            console.error('Failed to copy: ', err);
            this.toastService.showError('Failed to copy ID'); // Error Toast
        });
    }

    // Logout Flow
    initiateLogout() {
        this.authService.showLogoutPopup.set(true);
    }


    showMpinSheet = false;

    changeMpin() {
        this.showMpinSheet = true;
        document.body.style.overflow = 'hidden'; // Lock scroll
    }

    closeMpinSheet() {
        this.showMpinSheet = false;
        document.body.style.overflow = 'auto'; // Unlock scroll
    }
}
