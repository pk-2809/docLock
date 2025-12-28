import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent {
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    router = inject(Router);
    private toastService = inject(ToastService);

    // Modal States
    showRequestDocumentModal = false;
    showRequestCardModal = false;

    // Document Request Form
    documentRequest = {
        friendName: '',
        type: '',
        message: ''
    };

    // Card Request Form
    cardRequest = {
        friendName: '',
        type: '',
        purpose: '',
        message: ''
    };

    // Notification Loading State
    isFetchingNotifications = false;

    // Enhanced Stats Data
    stats = {
        documents: 128,
        cards: 12,
        shared: 5,
        friends: 24,
        storageUsed: 65, // percentage
        totalFiles: 140,
        totalSize: '2.4 GB',
        sharedToday: 3
    };

    // Weekly Activity Data for Chart
    weeklyActivity = [
        { label: 'Mon', percentage: 80 },
        { label: 'Tue', percentage: 45 },
        { label: 'Wed', percentage: 90 },
        { label: 'Thu', percentage: 60 },
        { label: 'Fri', percentage: 100 },
        { label: 'Sat', percentage: 30 },
        { label: 'Sun', percentage: 20 }
    ];

    // Recent Activities Data for Table
    recentActivities = [
        {
            id: 1,
            title: 'Document uploaded',
            description: 'passport_scan.pdf added to Identity folder',
            time: '2 min ago',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            iconPath: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
            statusColor: 'bg-green-500'
        },
        {
            id: 2,
            title: 'Card added',
            description: 'New credit card saved securely',
            time: '15 min ago',
            iconBg: 'bg-pink-50',
            iconColor: 'text-pink-600',
            iconPath: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
            statusColor: 'bg-blue-500'
        },
        {
            id: 3,
            title: 'File shared',
            description: 'license.jpg shared with John Doe',
            time: '1 hour ago',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            iconPath: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
            statusColor: 'bg-amber-500'
        },
        {
            id: 4,
            title: 'Folder created',
            description: 'New folder "Medical Records" created',
            time: '3 hours ago',
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            iconPath: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
            statusColor: 'bg-slate-400'
        }
    ];

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
                this.router.navigate(['/notifications']);
            }
        });
    }

    navigateToCards() {
        this.router.navigate(['/cards']);
    }

    selectDocumentType(type: string) {
        this.documentRequest.type = type;
    }

    selectCardType(type: string) {
        this.cardRequest.type = type;
    }

    sendDocumentRequest() {
        if (this.documentRequest.friendName && this.documentRequest.type) {
            this.toastService.showSuccess('Document request sent successfully!');
            this.showRequestDocumentModal = false;
            this.resetDocumentRequest();
        } else {
            this.toastService.showError('Please fill in all required fields');
        }
    }

    sendCardRequest() {
        if (this.cardRequest.friendName && this.cardRequest.type) {
            this.toastService.showSuccess('Card request sent successfully!');
            this.showRequestCardModal = false;
            this.resetCardRequest();
        } else {
            this.toastService.showError('Please fill in all required fields');
        }
    }

    private resetDocumentRequest() {
        this.documentRequest = {
            friendName: '',
            type: '',
            message: ''
        };
    }

    private resetCardRequest() {
        this.cardRequest = {
            friendName: '',
            type: '',
            purpose: '',
            message: ''
        };
    }

    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
    }
}
