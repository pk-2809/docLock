import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth';
import { NotificationService } from '../../core/services/notification.service';
import { ToastService } from '../../core/services/toast.service';
import { DocumentService, Document } from '../../core/services/document';
import { forkJoin, finalize } from 'rxjs';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    router = inject(Router);
    private toastService = inject(ToastService);
    private documentService = inject(DocumentService);
    private cdr = inject(ChangeDetectorRef);

    // Notification Loading State
    isFetchingNotifications = false;

    // Data
    documents: Document[] = [];
    cardsCount = 0; // Placeholder - can be updated when CardService is available

    // Dashboard Data
    readonly storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB
    readonly cardLimit = 50;
    readonly qrLimit = 20;

    get dashboardStats() {
        const totalSize = this.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
        const storageUsedGB = totalSize / (1024 * 1024 * 1024);
        const storagePercentage = Math.min((totalSize / this.storageLimitBytes) * 100, 100);

        const cardsPercentage = Math.min((this.cardsCount / this.cardLimit) * 100, 100);

        // Placeholder for QRs as logic isn't fully implemented
        const qrsCount = 5;
        const qrsPercentage = Math.min((qrsCount / this.qrLimit) * 100, 100);

        return {
            storage: {
                used: storageUsedGB.toFixed(2),
                total: '5',
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
                color: '#22c55e' // Green
            }
        };
    }

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
        switch (this.selectedChartStat) {
            case 'storage':
                return this.dashboardStats.storage.percentage;
            case 'cards':
                return this.dashboardStats.cards.percentage;
            case 'qrs':
                return this.dashboardStats.qrs.percentage;
            default:
                return this.dashboardStats.storage.percentage;
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
        switch (this.selectedChartStat) {
            case 'storage':
                return {
                    used: this.dashboardStats.storage.used,
                    total: this.dashboardStats.storage.total,
                    unit: 'GB',
                    label: 'Storage'
                };
            case 'cards':
                return {
                    used: this.dashboardStats.cards.used,
                    total: this.dashboardStats.cards.total,
                    unit: '',
                    label: 'Cards'
                };
            case 'qrs':
                return {
                    used: this.dashboardStats.qrs.used,
                    total: this.dashboardStats.qrs.total,
                    unit: '',
                    label: 'QRs'
                };
            default:
                return {
                    used: this.dashboardStats.storage.used,
                    total: this.dashboardStats.storage.total,
                    unit: 'GB',
                    label: 'Storage'
                };
        }
    }

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.documentService.getDocuments().subscribe({
            next: (res) => {
                if (res && res.documents) {
                    this.documents = res.documents;
                    this.cdr.detectChanges();
                }
            },
            error: (error) => {
                console.error('Error loading documents:', error);
            }
        });
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
