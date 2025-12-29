import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeopleService } from '../../../core/people/people.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormsModule } from '@angular/forms';
import { ConfirmationSheetComponent } from '../../../shared/components/confirmation-sheet/confirmation-sheet';
import { trigger, state, style, transition, animate } from '@angular/animations';
// Removed DocumentService/CardService logic from here as it is moved to Fulfillment Flow (Notifications)

@Component({
    selector: 'app-friend-list',
    standalone: true,
    imports: [CommonModule, RouterLink, ConfirmationSheetComponent, FormsModule],
    templateUrl: './friend-list.html',
    styleUrl: './friend-list.css',
    animations: [
        trigger('expandCollapse', [
            transition(':enter', [
                style({ height: '0px', opacity: 0, overflow: 'hidden' }),
                animate('300ms ease-out', style({ height: '*', opacity: 1 }))
            ]),
            transition(':leave', [
                style({ height: '*', opacity: 1, overflow: 'hidden' }),
                animate('300ms ease-in', style({ height: '0px', opacity: 0 }))
            ])
        ])
    ]
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
        this.openRequestSheet(friend, 'card');
    }

    requestDocument(friend: any) {
        this.openRequestSheet(friend, 'document');
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

    // Request Functionality
    showRequestSheet = signal(false);
    requestType = signal<'document' | 'card'>('document');
    requestQuery = signal('');
    isRequesting = signal(false);

    openRequestSheet(friend: any, type: 'document' | 'card') {
        this.selectedFriendId.set(friend.uid);
        this.requestType.set(type);
        this.showRequestSheet.set(true);
    }

    closeRequestSheet() {
        this.showRequestSheet.set(false);
        this.requestQuery.set('');
        this.isRequesting.set(false);
    }

    sendRequestItem() {
        const friendId = this.selectedFriendId();
        this.closeInteractionCard();
        const type = this.requestType();
        const name = this.requestQuery();

        if (!friendId || !name.trim()) {
            console.warn('Cannot send request: Missing data', { friendId, name });
            return;
        }

        console.log('Sending request...', { friendId, type, name });

        this.isRequesting.set(true);
        this.peopleService.requestItem(friendId, type, name).subscribe({
            next: () => {
                this.toastService.showSuccess(`Requested ${type} successfully`);
                this.isRequesting.set(false);
                this.closeRequestSheet();
            },
            error: (err) => {
                console.error(err);
                this.toastService.showError('Failed to send request');
                this.isRequesting.set(false);
            }
        });
    }
}
