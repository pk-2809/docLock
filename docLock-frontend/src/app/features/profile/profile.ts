import { Component, inject, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { ToastService } from '../../core/services/toast.service';

import { ConfirmationSheetComponent } from '../../shared/components/confirmation-sheet/confirmation-sheet';
import { MpinSetupComponent } from '../auth/mpin-setup/mpin-setup';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, MpinSetupComponent, ConfirmationSheetComponent, FormsModule],
    templateUrl: './profile.html',
    styleUrl: './profile.css'
})
export class ProfileComponent {
    authService = inject(AuthService);
    router = inject(Router);
    toastService = inject(ToastService); // Inject ToastService

    user = this.authService.user;
    isUploading = signal(false);

    // Computed stats for template
    get stats() {
        const u = this.user();
        return {
            documents: u?.documentsCount || 0,
            storageUsed: u?.storageUsed || 0
        };
    }
    // Mock stats removed - using user signal directly



    // File Upload
    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Limit size to 5MB (matches backend)
            if (file.size > 5 * 1024 * 1024) {
                this.toastService.showError('Image size must be less than 5MB');
                return;
            }

            this.isUploading.set(true); // Start loading

            // Upload directly
            this.updateProfileImage(file);
        }
    }

    updateProfileImage(file: File) {
        const formData = new FormData();
        formData.append('profileImage', file);

        this.authService.updateProfile(formData).subscribe({
            next: () => {
                // Force session refresh to show new image immediately
                this.authService.checkSession().subscribe(() => {
                    this.isUploading.set(false); // Stop loading
                    this.toastService.showSuccess('Profile updated successfully'); // Success Toast
                });
            },
            error: (err) => {
                console.error('Failed to update profile', err);
                this.toastService.showError('Failed to update profile'); // Error Toast
                this.isUploading.set(false); // Stop loading
            }
        });
    }

    isEditingName = signal(false);
    newName = signal('');
    isSavingName = signal(false);

    @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

    toggleEditName() {
        this.newName.set(this.user()?.name || '');
        this.isEditingName.set(true);
        setTimeout(() => {
            if (this.nameInput) {
                this.nameInput.nativeElement.focus();
            }
        }, 100);
    }

    cancelEditName() {
        this.isEditingName.set(false);
        this.newName.set('');
    }

    saveName() {
        if (!this.newName() || this.newName().trim() === '') {
            this.toastService.showError('Name cannot be empty');
            return;
        }

        if (this.newName() === this.user()?.name) {
            this.isEditingName.set(false);
            return;
        }

        this.isSavingName.set(true);

        const formData = new FormData();
        formData.append('name', this.newName());

        this.authService.updateProfile(formData).subscribe({
            next: () => {
                this.authService.checkSession().subscribe(() => {
                    this.isSavingName.set(false);
                    this.isEditingName.set(false);
                    this.toastService.showSuccess('Name updated successfully');
                });
            },
            error: (err) => {
                console.error('Failed to update name', err);
                this.toastService.showError('Failed to update name');
                this.isSavingName.set(false);
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

    showDeleteSheet = false;
    isDeleting = false; // Add loading state for delete

    initiateDeleteAccount() {
        this.showDeleteSheet = true;
    }

    closeDeleteSheet() {
        if (this.isDeleting) return;
        this.showDeleteSheet = false;
    }

    confirmDeleteAccount() {
        this.isDeleting = true;
        this.authService.deleteAccount().subscribe({
            next: () => {
                this.isDeleting = false;
                this.showDeleteSheet = false;
                this.toastService.showSuccess('Account deleted successfully');
                this.router.navigate(['/login']);
                this.authService.user.set(null); // Clear local user state
            },
            error: (err) => {
                console.error('Failed to delete account', err);
                this.isDeleting = false;
                this.showDeleteSheet = false;
                this.toastService.showError('Failed to delete account');
            }
        });
    }

    // Stop propagation of key events to prevent global shortcuts (like opening menus)
    // when typing in inputs
    onInputKeydown(event: KeyboardEvent) {
        // Check for Ctrl+A or Cmd+A (Select All)
        const isSelectAll = (event.ctrlKey || event.metaKey) && (event.key === 'a' || event.code === 'KeyA');

        if (isSelectAll) {
            // Prevent the default browser behavior (which might be opening a menu or bubbling)
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            // Manually perform the "Select All" action
            const target = event.target as HTMLInputElement;
            if (target && typeof target.select === 'function') {
                target.select();
            }
        } else {
            // For other keys, just stop propagation to be safe, but allow default typing
            event.stopPropagation();
        }
    }
}
