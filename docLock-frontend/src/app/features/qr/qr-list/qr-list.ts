import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentService, Document } from '../../../core/services/document';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';

export interface QRCode {
    id: string;
    name: string;
    createdAt: Date;
    linkedDocumentIds: string[]; // The key feature: List of linked doc IDs
    scanCount: number;
    // UI Helpers added dynamically or implied
}

@Component({
    selector: 'app-qr-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BottomSheetComponent],
    templateUrl: './qr-list.html',
    styleUrl: './qr-list.css'
})
export class QrListComponent implements OnInit {
    private router = inject(Router);
    private documentService = inject(DocumentService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);

    // Data
    documents: Document[] = [];
    qrCodes: QRCode[] = []; // Local "database" of QRs

    // Creation Form State
    isCreating = false;
    newQrName = '';
    selectedDocumentIds: Set<string> = new Set();
    isLoadingDocs = false;
    editingQrId: string | null = null; // Track if we are editing

    // View State
    baseUrl = window.location.origin; // For generating the public link

    ngOnInit() {
        this.loadDocuments();
        this.loadSavedQRs();
    }

    loadDocuments() {
        this.isLoadingDocs = true;
        // In a real app, we might need to subscribe, but fetching once for list is okay
        this.documentService.getDocuments().subscribe({
            next: (res) => {
                this.documents = res.documents;
                this.isLoadingDocs = false;
            },
            error: (err) => {
                console.error('Failed to load documents', err);
                this.isLoadingDocs = false;
            }
        });
    }

    loadSavedQRs() {
        // Mock: Load from local storage to persist across reloads for demo
        const saved = localStorage.getItem('my_mock_qrs');
        if (saved) {
            this.qrCodes = JSON.parse(saved);
        }
    }

    toggleCreateMode() {
        this.isCreating = !this.isCreating;
        if (!this.isCreating) {
            this.newQrName = '';
            this.selectedDocumentIds.clear();
            this.editingQrId = null;
        }
    }

    toggleDocumentSelection(docId: string) {
        if (this.selectedDocumentIds.has(docId)) {
            this.selectedDocumentIds.delete(docId);
        } else {
            this.selectedDocumentIds.add(docId);
        }
    }

    createQR() {
        if (!this.newQrName.trim()) {
            this.toastService.showError('Please enter a name for your QR.');
            return;
        }

        if (this.selectedDocumentIds.size === 0) {
            this.toastService.showError('Please select at least one document.');
            return;
        }

        if (this.editingQrId) {
            // Update existing QR
            const index = this.qrCodes.findIndex(q => q.id === this.editingQrId);
            if (index !== -1) {
                this.qrCodes[index] = {
                    ...this.qrCodes[index],
                    linkedDocumentIds: Array.from(this.selectedDocumentIds)
                };
                this.saveQRsToStorage();
                this.toggleCreateMode();
                this.toastService.showSuccess('Secure QR updated successfully!');
            }
        } else {
            // Create New QR
            const newQR: QRCode = {
                id: Math.random().toString(36).substring(2, 10),
                name: this.newQrName,
                createdAt: new Date(),
                linkedDocumentIds: Array.from(this.selectedDocumentIds),
                scanCount: 0
            };

            this.qrCodes.unshift(newQR);
            this.saveQRsToStorage();
            this.toggleCreateMode();
            this.toastService.showSuccess('Secure QR created successfully!');
        }
    }

    deleteQR(id: string, event: Event) {
        event.stopPropagation(); // Prevent clicking the card
        if (confirm('Are you sure you want to delete this QR?')) {
            this.qrCodes = this.qrCodes.filter(q => q.id !== id);
            this.saveQRsToStorage();
        }
    }

    saveQRsToStorage() {
        localStorage.setItem('my_mock_qrs', JSON.stringify(this.qrCodes));
    }

    viewQR(qr: QRCode) {
        // Enable Edit Mode
        this.editingQrId = qr.id;
        this.newQrName = qr.name;
        this.selectedDocumentIds = new Set(qr.linkedDocumentIds);
        this.isCreating = true;
    }

    getPublicUrl(qr: QRCode): string {
        return `${this.baseUrl}/qr/view/${qr.id}`;
    }

    // UI Helpers
    formatDate(date: string | Date): string {
        return new Date(date).toLocaleDateString();
    }

    getDocumentName(id: string): string {
        const doc = this.documents.find(d => d.id === id);
        return doc ? doc.name : 'Unknown Document';
    }

    // Helper to get QR Image URL
    generateQRCode(data: string): string {
        const size = 150;
        const encodedData = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&margin=0`;
    }

    async downloadQRCard(qr: QRCode, event: Event) {
        event.stopPropagation();
        const element = document.getElementById(`qr-card-${qr.id}`);
        if (!element) return;

        // SAFE FIX: Add export-mode class to simplify styles for capture
        element.classList.add('export-mode');

        // MANUAL STYLE INJECTION: Brute-force the export styles to ensure they apply
        const badge = element.querySelector('.glass-badge') as HTMLElement;
        const title = element.querySelector('h3') as HTMLElement;

        const originalBadgeStyle = badge ? badge.style.cssText : '';
        const originalTitleStyle = title ? title.style.cssText : '';

        if (badge) {
            badge.style.cssText = `
                background-color: rgba(255, 255, 255, 0.25) !important;
                border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                height: 26px !important;
                padding: 0 12px !important;
                border-radius: 999px !important;
                width: fit-content !important;
                white-space: nowrap !important;
                -webkit-font-smoothing: antialiased !important;
            `;
        }

        if (title) {
            title.style.cssText += `
                display: block !important;
                overflow: visible !important;
                -webkit-line-clamp: unset !important;
                line-clamp: unset !important;
                white-space: normal !important;
                height: auto !important;
                padding-bottom: 0.5rem !important;
            `;
        }

        try {
            // Dynamic import to avoid initial bundle bloat
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(element, {
                scale: 4, // Ultra-High resolution
                backgroundColor: null, // Transparent background (will use container style)
                useCORS: true, // For the QR image if cross-origin
                logging: false,
                allowTaint: true
            });

            const link = document.createElement('a');
            link.download = `SecureQR-${qr.name.replace(/\s+/g, '_')}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.toastService.showSuccess('QR Card downloaded successfully!');
        } catch (error: any) {
            console.error('Download failed', error);
            this.toastService.showError(`Download failed: ${error.message || 'Unknown error'}`);
        } finally {
            // SAFE FIX: Remove class and restore original styles
            element.classList.remove('export-mode');
            if (badge) badge.style.cssText = originalBadgeStyle;
            if (title) title.style.cssText = originalTitleStyle; // Note: this might revert other dynamic styles if not careful, but usually clean
        }
    }
}
