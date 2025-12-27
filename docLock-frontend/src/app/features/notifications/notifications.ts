import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmationSheetComponent } from '../../shared/components/confirmation-sheet/confirmation-sheet';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, RouterLink, ConfirmationSheetComponent, TimeAgoPipe],
    templateUrl: './notifications.html',
    styles: []
})
export class NotificationsComponent {
    notificationService = inject(NotificationService);
    notifications = this.notificationService.notifications;

    // Confirmation State
    showClearConfirmation = false;

    // Loading States
    isMarkingRead = false;
    isClearing = false;

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
}
