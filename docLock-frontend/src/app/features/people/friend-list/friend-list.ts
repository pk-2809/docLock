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
    isDeleting = signal(false);

    // Friend Interaction State
    selectedFriendId = signal<string | null>(null);
    showInteractionCard = signal(false);

    ngOnInit() {
        if (!this.peopleService.loaded()) {
            this.loadFriends();
        } else {
            this.isLoading.set(false);
        }
    }

    loadFriends() {
        this.isLoading.set(true);
        this.peopleService.getFriends().subscribe({
            next: () => this.isLoading.set(false),
            error: () => this.isLoading.set(false)
        });
    }

    friendNameToDelete = signal('');

    confirmDelete(friend: any) {
        this.friendToDelete.set(friend.uid);
        this.friendNameToDelete.set(friend.name);
        this.showConfirmation.set(true);
    }

    onDeleteConfirmed() {
        const friendId = this.friendToDelete();
        if (!friendId) return;

        this.isDeleting.set(true);
        this.peopleService.deleteFriend(friendId).subscribe({
            next: () => {
                this.toastService.showSuccess('Friend removed successfully');
                this.isDeleting.set(false);
                this.closeConfirmation();
            },
            error: (err) => {
                this.toastService.showError('Failed to remove friend');
                this.isDeleting.set(false);
                this.closeConfirmation();
            }
        });
    }

    closeConfirmation() {
        this.showConfirmation.set(false);
        this.friendToDelete.set(null);
    }

    // Friend Interaction Methods
    onFriendClick(friend: any) {
        if (this.selectedFriendId() === friend.uid) {
            // If same friend clicked, toggle interaction card
            this.showInteractionCard.set(!this.showInteractionCard());
        } else {
            // If different friend clicked, select new friend and show interaction card
            this.selectedFriendId.set(friend.uid);
            this.showInteractionCard.set(true);
        }
    }

    requestCard(friend: any) {
        this.toastService.showSuccess(`Card request sent to ${friend.name}`);
        this.closeInteractionCard();
    }

    requestDocument(friend: any) {
        this.toastService.showSuccess(`Document request sent to ${friend.name}`);
        this.closeInteractionCard();
    }

    closeInteractionCard() {
        this.selectedFriendId.set(null);
        this.showInteractionCard.set(false);
    }

    getSelectedFriend() {
        const friendId = this.selectedFriendId();
        if (!friendId) return null;
        return this.friends().find(f => f.uid === friendId) || null;
    }
}
