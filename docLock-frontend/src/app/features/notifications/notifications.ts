import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { NotificationMessagePipe } from '../../shared/pipes/notification-message.pipe';
import { DocumentService, Document } from '../../core/services/document';
import { CardService, Card } from '../../core/services/card';
import { PeopleService } from '../../core/people/people.service';
import { ToastService } from '../../core/services/toast.service';
import { InputSanitizerService } from '../../core/services/input-sanitizer.service';
import { FormsModule } from '@angular/forms';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, TimeAgoPipe, NotificationMessagePipe, BottomSheetComponent],
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
        @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        .animate-bounce-slow {
            animation: bounce-slow 3s infinite ease-in-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 20px;
        }
    `]
})
export class NotificationsComponent {
    notificationService = inject(NotificationService);
    documentService = inject(DocumentService);
    cardService = inject(CardService);
    peopleService = inject(PeopleService);
    toastService = inject(ToastService);
    inputSanitizer = inject(InputSanitizerService);

    notifications = this.notificationService.notifications;


    showClearConfirmation = false;


    isMarkingRead = false;
    isClearing = false;


    showFulfillSheet = signal(false);
    requestData = signal<any>(null);
    currentNotificationId = signal<string | null>(null);
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


    onNotificationClick(notification: any) {
        if (!notification.metadata || notification.metadata.type !== 'request') return;


        if (notification.metadata.status === 'fulfilled') {
            return;
        }

        this.currentNotificationId.set(notification.id);
        this.requestData.set(notification.metadata);
        this.loadItems(notification.metadata.itemType);
        this.searchQuery.set('');
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
                error: () => {
                    this.isLoadingItems.set(false);
                }
            });
        } else {
            this.cardService.getCards().subscribe({
                next: (res) => {
                    this.availableCards.set(res.cards || []);
                    this.isLoadingItems.set(false);
                },
                error: () => {
                    this.isLoadingItems.set(false);
                }
            });
        }
    }

    getEligibleItems() {
        const type = this.requestData()?.itemType;
        if (type === 'document') {
            return this.availableDocuments().filter(doc => !doc.sharedBy);
        } else {
            return this.availableCards().filter(card => !card.sharedBy);
        }
    }

    getFilteredItems() {
        const query = this.searchQuery().toLowerCase();
        const items = this.getEligibleItems();

        if (!query) return items;

        return items.filter(item => item.name.toLowerCase().includes(query));
    }

    onSearchInput(event: Event) {
        const input = event.target as HTMLInputElement;
        const sanitized = this.inputSanitizer.sanitize(input.value);
        if (input.value !== sanitized) {
            input.value = sanitized;
        }
        this.searchQuery.set(sanitized);
    }

    selectItem(id: string) {
        if (this.selectedItemId() === id) {
            this.selectedItemId.set(null);
        } else {
            this.selectedItemId.set(id);
        }
    }

    sendItem() {
        const data = this.requestData();
        const itemId = this.selectedItemId();
        const notifId = this.currentNotificationId();

        if (!data || !itemId || !notifId) return;

        this.isSending.set(true);
        this.peopleService.shareItem(data.requesterId, itemId, data.itemType, notifId).subscribe({
            next: () => {
                this.toastService.showSuccess('Item sent successfully');
                this.isSending.set(false);


                this.notificationService.updateLocalNotification(notifId, {
                    metadata: { ...data, status: 'fulfilled' },
                    read: true,
                    icon: 'check-circle'
                });

                this.closeFulfillSheet();
            },
            error: () => {
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
