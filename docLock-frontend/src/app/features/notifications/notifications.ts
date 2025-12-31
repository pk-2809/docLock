import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { DocumentService, Document } from '../../core/services/document';
import { CardService, Card } from '../../core/services/card';
import { PeopleService } from '../../core/people/people.service';
import { ToastService } from '../../core/services/toast.service';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, RouterLink, TimeAgoPipe, FormsModule],
    templateUrl: './notifications.html',
    styles: [`
        @keyframes slide-up {
            from {
                opacity: 0;
                transform: translateY(100%);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-slide-up {
            animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
    `]
})
export class NotificationsComponent {
    notificationService = inject(NotificationService);
    documentService = inject(DocumentService);
    cardService = inject(CardService);
    peopleService = inject(PeopleService);
    toastService = inject(ToastService);

    notifications = this.notificationService.notifications;

    // Confirmation State
    showClearConfirmation = false;

    // Loading States
    isMarkingRead = false;
    isClearing = false;

    // Fulfillment State
    showFulfillSheet = signal(false);
    requestData = signal<any>(null);
    availableDocuments = signal<Document[]>([]);
    availableCards = signal<Card[]>([]);
    searchQuery = signal('');
    selectedItemId = signal<string | null>(null);
    isSending = signal(false);
    isLoadingItems = signal(false);

    constructor() {
    }

    markAllRead() {
        if (this.isMarkingRead) return;
        this.isMarkingRead = true;
        this.notificationService.markAllAsRead().subscribe({
            next: () => this.isMarkingRead = false,
            error: () => this.isMarkingRead = false
        });
    }

    confirmClearAll() {
        if (this.notifications().length === 0) return;
        this.showClearConfirmation = true;
    }

    onClearConfirmed() {
        this.closeConfirmation();
        if (this.isClearing) return;

        this.isClearing = true;
        this.notificationService.clearAll().subscribe({
            next: () => this.isClearing = false,
            error: () => this.isClearing = false
        });
    }

    closeConfirmation() {
        this.showClearConfirmation = false;
    }

    // Notification Interaction
    onNotificationClick(notification: any) {
        if (!notification.metadata || notification.metadata.type !== 'request') return;

        this.requestData.set(notification.metadata);
        this.loadItems(notification.metadata.itemType);
        this.searchQuery.set(''); // Empty search by default
        this.showFulfillSheet.set(true);
    }

    loadItems(type: 'document' | 'card') {
        this.isLoadingItems.set(true);
        if (type === 'document') {
            this.documentService.getDocuments().subscribe({
                next: (res) => {
                    this.availableDocuments.set(res.documents || []);
                    this.isLoadingItems.set(false);
                },
                error: (err) => {
                    console.error('Failed to load docs', err);
                    this.isLoadingItems.set(false);
                }
            });
        } else {
            this.cardService.getCards().subscribe({
                next: (res) => {
                    this.availableCards.set(res.cards || []);
                    this.isLoadingItems.set(false);
                },
                error: (err) => {
                    console.error('Failed to load cards', err);
                    this.isLoadingItems.set(false);
                }
            });
        }
    }

    getFilteredItems() {
        const query = this.searchQuery().toLowerCase();
        const type = this.requestData()?.itemType;

        if (type === 'document') {
            return this.availableDocuments().filter(doc => doc.name.toLowerCase().includes(query));
        } else {
            return this.availableCards().filter(card => card.name.toLowerCase().includes(query));
        }
    }

    selectItem(id: string) {
        this.selectedItemId.set(id);
    }

    sendItem() {
        const data = this.requestData();
        const itemId = this.selectedItemId();
        if (!data || !itemId) return;

        this.isSending.set(true);
        this.peopleService.shareItem(data.requesterId, itemId, data.itemType).subscribe({
            next: () => {
                this.toastService.showSuccess('Item sent successfully');
                this.isSending.set(false);
                this.closeFulfillSheet();
            },
            error: (err) => {
                console.error(err);
                this.toastService.showError('Failed to send item');
                this.isSending.set(false);
            }
        });
    }

    closeFulfillSheet() {
        this.showFulfillSheet.set(false);
        this.requestData.set(null);
        this.selectedItemId.set(null);
        this.searchQuery.set('');
    }
}
