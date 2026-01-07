import { Component, inject, OnInit, ChangeDetectorRef, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { DocumentService, Document, Folder } from '../../core/services/document';
import { CardService, Card } from '../../core/services/card';
import { QrService } from '../../core/services/qr';
import { AppConfigService } from '../../core/services/app-config.service';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    router = inject(Router);
    private toastService = inject(ToastService);
    private documentService = inject(DocumentService);
    private cardService = inject(CardService);
    qrService = inject(QrService);
    private cdr = inject(ChangeDetectorRef);
    private appConfigService = inject(AppConfigService);

    // Notification Loading State
    isFetchingNotifications = false;

    // Data
    // Data via Signals
    get documents() { return this.documentService.documents(); }
    get folders() { return this.documentService.folders(); }
    get cards() { return this.cardService.cards(); }
    get cardsCount() { return this.cards.length; }

    // Dashboard Data
    get storageLimitBytes(): number {
        return this.appConfigService.config().maxStorageLimit;
    }

    get cardLimit(): number {
        const config = this.appConfigService.config();
        return config.maxDebitCardsLimit + config.maxCreditCardsLimit;
    }

    get qrLimit(): number {
        return this.appConfigService.config().maxQrLimit;
    }


    dashboardStats = computed(() => {
        const totalSize = this.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
        // Ensure storageLimitBytes is not 0
        const limit = this.storageLimitBytes || 1;

        // Dynamic Unit Logic
        const isBelow1GB = limit < (1024 * 1024 * 1024);
        const divisor = isBelow1GB ? (1024 * 1024) : (1024 * 1024 * 1024);
        const unit = isBelow1GB ? 'MB' : 'GB';

        const storageUsed = totalSize / divisor;
        const storagePercentage = Math.min((totalSize / limit) * 100, 100);

        const cardsPercentage = Math.min((this.cardsCount / this.cardLimit) * 100, 100);

        const qrsCount = this.qrService.qrs().length;
        const qrsPercentage = Math.min((qrsCount / this.qrLimit) * 100, 100);

        return {
            storage: {
                used: storageUsed.toFixed(2),
                total: (limit / divisor).toFixed(2).replace(/[.,]00$/, ''),
                unit: unit,
                percentage: storagePercentage,
                color: '#3b82f6' // Blue
            },
            cards: {

                used: this.cardsCount,
                total: this.cardLimit,
                percentage: cardsPercentage,
                color: '#ec4899' // Pink
            },
            qrs: {
                used: qrsCount,
                total: this.qrLimit,
                percentage: qrsPercentage,
                color: '#F16D34' // Orange
            }
        };
    });

    get totalStats() {
        const totalDocs = this.documents.length;
        return {
            documents: totalDocs
        };
    }

    // Interactive chart state
    selectedChartStat: 'storage' | 'cards' | 'qrs' = 'storage';

    // Helper to calculate SVG dash properties for circular progress
    getCircleDashArray(percentage: number, radius: number): string {
        const circumference = 2 * Math.PI * radius;
        const dash = (percentage / 100) * circumference;
        return `${dash} ${circumference}`;
    }

    // Get current chart display value based on selected stat
    getCurrentChartValue(): number {
        const stats = this.dashboardStats();
        switch (this.selectedChartStat) {
            case 'storage':
                return stats.storage.percentage;
            case 'cards':
                return stats.cards.percentage;
            case 'qrs':
                return stats.qrs.percentage;
            default:
                return stats.storage.percentage;
        }
    }

    // Get current chart label
    getCurrentChartLabel(): string {
        switch (this.selectedChartStat) {
            case 'storage':
                return 'Storage';
            case 'cards':
                return 'Cards';
            case 'qrs':
                return 'QRs';
            default:
                return 'Storage';
        }
    }

    // Select chart stat for display
    selectChartStat(stat: 'storage' | 'cards' | 'qrs') {
        this.selectedChartStat = stat;
    }

    // Get details for selected chart stat
    getSelectedStatDetails() {
        const stats = this.dashboardStats();
        switch (this.selectedChartStat) {
            case 'storage':
                return {
                    used: stats.storage.used,
                    total: stats.storage.total,
                    unit: stats.storage.unit,
                    label: 'Storage'
                };
            case 'cards':
                return {
                    used: stats.cards.used,
                    total: stats.cards.total,
                    unit: '',
                    label: 'Cards'
                };
            case 'qrs':
                return {
                    used: stats.qrs.used,
                    total: stats.qrs.total,
                    unit: '',
                    label: 'QRs'
                };
            default:
                return {
                    used: stats.storage.used,
                    total: stats.storage.total,
                    unit: stats.storage.unit,
                    label: 'Storage'
                };
        }
    }

    ngOnInit() {
        // Subscriptions are now handled globally in AuthService
        this.qrService.loadQrs();
    }

    // loadData is removed as we use real-time subscriptions now

    getTimeAgo(date: Date): string {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";

        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";

        return "Just now";
    }

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

    navigateToDocuments() {
        this.router.navigate(['/documents']);
    }

    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
    }
}
