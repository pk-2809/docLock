import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeopleService } from '../../../core/people/people.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmationSheetComponent } from '../../../shared/components/confirmation-sheet/confirmation-sheet';

@Component({
    selector: 'app-friend-list',
    standalone: true,
    imports: [CommonModule, RouterLink, ConfirmationSheetComponent],
    templateUrl: './friend-list.html',
    styleUrl: './friend-list.css'
})
export class FriendListComponent implements OnInit {
    peopleService = inject(PeopleService);
    toastService = inject(ToastService); // Inject Toast
    friends = this.peopleService.friends;
    isLoading = signal(true);

    // Confirmation Sheet State
    showConfirmation = signal(false);
    friendToDelete = signal<string | null>(null);

    ngOnInit() {
        this.loadFriends();
    }

    loadFriends() {
        this.isLoading.set(true);
        this.peopleService.getFriends().subscribe({
            next: () => this.isLoading.set(false),
            error: () => this.isLoading.set(false)
        });
    }

    confirmDelete(friendId: string) {
        this.friendToDelete.set(friendId);
        this.showConfirmation.set(true);
    }

    onDeleteConfirmed() {
        const friendId = this.friendToDelete();
        if (!friendId) return;

        this.peopleService.deleteFriend(friendId).subscribe({
            next: () => {
                this.toastService.showSuccess('Friend removed successfully');
                this.closeConfirmation();
            },
            error: (err) => {
                this.toastService.showError('Failed to remove friend');
                this.closeConfirmation();
            }
        });
    }

    closeConfirmation() {
        this.showConfirmation.set(false);
        this.friendToDelete.set(null);
    }
}
