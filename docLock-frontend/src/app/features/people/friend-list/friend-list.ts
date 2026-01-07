import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeopleService, Friend } from '../../../core/people/people.service';
import { ToastService } from '../../../core/services/toast.service';
import { InputSanitizerService } from '../../../core/services/input-sanitizer.service';
import { FormsModule } from '@angular/forms';
import { trigger, state, style, transition, animate } from '@angular/animations';


@Component({
    selector: 'app-friend-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
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
    toastService = inject(ToastService);
    inputSanitizer = inject(InputSanitizerService);
    friends = this.peopleService.friends;
    isLoading = signal(true);


    searchQuery = signal('');

    onSearchInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const sanitized = this.inputSanitizer.sanitize(input.value);
        if (input.value !== sanitized) {
            input.value = sanitized;
        }
        this.searchQuery.set(sanitized);
    }


    showConfirmation = signal(false);
    friendToDelete = signal<string | null>(null);
    isDeleting = signal(false);


    selectedFriendId = signal<string | null>(null);


    showRequestSheet = signal(false);
    requestType = signal<'document' | 'card'>('document');
    requestQuery = signal('');
    isRequesting = signal(false);

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


    filteredFriends() {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.friends();

        return this.friends().filter(friend =>
            friend.name.toLowerCase().includes(query) ||
            friend.email?.toLowerCase().includes(query)
        );
    }


    getAvatarGradient(index: number): string {
        const gradients = [
            'bg-gradient-to-br from-pink-500 to-rose-600 shadow-lg shadow-pink-500/20',
            'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20',
            'bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/20',
            'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20',
            'bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20',
            'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20',
            'bg-gradient-to-br from-rose-500 to-pink-600 shadow-lg shadow-rose-500/20',
            'bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-500/20'
        ];
        return gradients[index % gradients.length];
    }


    sharedDocsCount = computed(() => this.friends().reduce((acc, curr) => acc + (curr.sharedDocs || 0), 0));
    sharedCardsCount = computed(() => this.friends().reduce((acc, curr) => acc + (curr.sharedCards || 0), 0));
    activeRequestsCount = computed(() => this.friends().reduce((acc, curr) => acc + (curr.activeRequests || 0), 0));

    getSharedItemsCount(friend: Friend): number {
        return (friend.sharedDocs || 0) + (friend.sharedCards || 0);
    }

    getRecentActivity(friend: Friend): any[] {
        return friend.recentActivity || [
            { id: 1, description: 'Shared passport document', time: '2h ago' },
            { id: 2, description: 'Requested credit card', time: '1d ago' }
        ];
    }


    quickRequestDocument(friend: Friend) {
        this.openRequestSheet(friend, 'document');
    }

    quickRequestCard(friend: Friend) {
        this.openRequestSheet(friend, 'card');
    }

    friendNameToDelete = signal('');

    confirmDelete(friend: Friend) {
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



    getSelectedFriend(): Friend | null {
        const friendId = this.selectedFriendId();
        if (!friendId) return null;
        return this.friends().find(f => f.uid === friendId) || null;
    }

    openRequestSheet(friend: Friend, type: 'document' | 'card') {
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
        const type = this.requestType();
        const name = this.requestQuery();

        if (!friendId) {
            return;
        }



        this.isRequesting.set(true);
        this.peopleService.requestItem(friendId, type, name).subscribe({
            next: () => {
                this.toastService.showSuccess(`Requested ${type} successfully`);
                this.isRequesting.set(false);
                this.closeRequestSheet();
            },
            error: (err) => {

                this.toastService.showError('Failed to send request');
                this.isRequesting.set(false);
            }
        });
    }
}
