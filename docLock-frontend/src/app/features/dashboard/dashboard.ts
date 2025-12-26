import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent {
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    router = inject(Router);

    // Notification Loading State
    isFetchingNotifications = false;

    // Mock Stats Data (Replace with real data later)
    stats = {
        images: 128,
        cards: 12,
        shared: 5,
        friends: 24,
        storageUsed: 65 // percentage
    };

    onNotificationClick() {
        if (this.isFetchingNotifications) return;

        this.isFetchingNotifications = true;
        this.notificationService.fetchNotifications().subscribe({
            next: () => {
                this.isFetchingNotifications = false;
                this.router.navigate(['/notifications']);
            },
            error: () => {
                this.isFetchingNotifications = false;
                this.router.navigate(['/notifications']); // Navigate anyway or show error? Usually navigate to show empty/error state there.
            }
        });
    }

    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
    }
}
