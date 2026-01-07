import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentService, Document } from '../../../core/services/document';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';
import { QrService, QRCode } from '../../../core/services/qr';

@Component({
    selector: 'app-qr-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, BottomSheetComponent],
    templateUrl: './qr-list.html',
    styleUrl: './qr-list.css'
})
export class QrListComponent implements OnInit {
    private router = inject(Router);
    private qrService = inject(QrService);
    private documentService = inject(DocumentService);
    private authService = inject(AuthService);
    private toastService = inject(ToastService);
    private cdr = inject(ChangeDetectorRef);

    // Data
    documents: Document[] = [];
    qrCodes: QRCode[] = [];

    // Creation Form State
    isCreating = false;
    newQrName = '';
    selectedDocumentIds: Set<string> = new Set();
    isLoadingDocs = false;
    editingQrId: string | null = null;

    // Delete State
    isDeleting = false;
    qrToDeleteId: string | null = null;
    isProcessing = false;

    // View State
    baseUrl = window.location.origin;
    downloadingQrId: string | null = null;

    ngOnInit() {
        this.loadDocuments();
        this.loadQrs();
    }

    loadDocuments() {
        this.isLoadingDocs = true;
        this.documentService.getDocuments().subscribe({
            next: (res) => {
                this.documents = res.documents;
                // Defer update to fix NG0100
                setTimeout(() => {
                    this.isLoadingDocs = false;
                }, 0);
            },
            error: (err) => {
                console.error('Failed to load documents', err);
                setTimeout(() => {
                    this.isLoadingDocs = false;
                }, 0);
            }
        });
    }

    loadQrs() {
        this.qrService.getQRs().subscribe({
            next: (res: any) => {
                this.qrCodes = res.qrs;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load QRs', err);
                this.toastService.showError('Failed to load existing QRs');
            }
        });
    }

    toggleCreateMode() {
        if (this.isCreating) {
            this.closeModal();
        } else {
            // Opening for Creation -> Reset State
            this.newQrName = '';
            this.selectedDocumentIds.clear();
            this.editingQrId = null;
            this.isCreating = true;
        }
    }

    closeModal() {
        this.isCreating = false;
        this.newQrName = '';
        this.selectedDocumentIds.clear();
        this.editingQrId = null;
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

        const data = {
            name: this.newQrName,
            mpin: '1234',
            linkedDocumentIds: Array.from(this.selectedDocumentIds)
        };

        this.isProcessing = true;

        if (this.editingQrId) {
            this.qrService.updateQR(this.editingQrId, { name: this.newQrName, linkedDocumentIds: Array.from(this.selectedDocumentIds) }).subscribe({
                next: (res: any) => {
                    const index = this.qrCodes.findIndex(q => q.id === this.editingQrId);
                    if (index !== -1) {
                        this.qrCodes[index] = res.qr;
                    }
                    this.closeModal();
                    this.toastService.showSuccess('Secure QR updated successfully!');
                    this.isProcessing = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.toastService.showError('Failed to update QR');
                    this.isProcessing = false;
                }
            });
        } else {
            this.qrService.createQR(data).subscribe({
                next: (res: any) => {
                    this.qrCodes.unshift(res.qr);
                    this.closeModal();
                    this.toastService.showSuccess('Secure QR created! Default MPIN: 1234');
                    this.isProcessing = false;
                    this.cdr.detectChanges();
                },
                error: () => {
                    this.toastService.showError('Failed to create QR');
                    this.isProcessing = false;
                }
            });
        }
    }

    deleteQR(id: string, event: Event) {
        event.stopPropagation();
        this.qrToDeleteId = id;
        this.isDeleting = true;
    }

    confirmDelete() {
        if (this.qrToDeleteId) {
            this.isProcessing = true;
            this.qrService.deleteQR(this.qrToDeleteId).subscribe({
                next: () => {
                    this.qrCodes = this.qrCodes.filter(q => q.id !== this.qrToDeleteId);
                    this.toastService.showSuccess('Secure QR deleted successfully');
                    this.cancelDelete();
                    this.isProcessing = false;
                },
                error: (err) => {
                    this.toastService.showError('Failed to delete QR');
                    this.cancelDelete();
                    this.isProcessing = false;
                }
            });
        }
    }

    cancelDelete() {
        this.isDeleting = false;
        this.qrToDeleteId = null;
    }

    viewQR(qr: QRCode) {
        this.editingQrId = qr.id;
        this.newQrName = qr.name;
        this.selectedDocumentIds = new Set(qr.linkedDocumentIds);
        this.isCreating = true;
    }

    getPublicUrl(qr: QRCode): string {
        return `${this.baseUrl}/access/${qr.id}`;
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
        this.downloadingQrId = qr.id; // Start loading

        const element = document.getElementById(`qr-card-${qr.id}`);
        if (!element) {
            this.downloadingQrId = null;
            return;
        }

        element.classList.add('export-mode');

        const badge = element.querySelector('.glass-badge') as HTMLElement;
        const elements = badge?.querySelectorAll('.export-text') as NodeListOf<HTMLElement> | null;
        elements?.forEach(el => el.classList.add('export-fix'));
        const metaDate = element.querySelector('.meta-date') as HTMLElement;
        const elements1 = metaDate?.querySelectorAll('.export-text') as NodeListOf<HTMLElement> | null;
        elements1?.forEach(el => el.classList.add('export-fix'));
        const title = element.querySelector('h3') as HTMLElement;

        const originalBadgeStyle = badge ? badge.style.cssText : '';
        const originalMetaDateStyle = metaDate ? metaDate.style.cssText : '';
        const originalTitleStyle = title ? title.style.cssText : '';

        if (badge) {
            badge.style.cssText = `
                background-color: rgba(255, 255, 255, 0.25) !important;
                border: 1.5px solid rgba(255, 255, 255, 0.5) !important;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05) !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                align-self: flex-start !important; /* Prevent stretching in flex-col */
                gap: 8px !important;
                height: 34px !important;
                padding: 0 14px !important;
                border-radius: 999px !important;
                width: fit-content !important;
                white-space: nowrap !important;
                -webkit-font-smoothing: antialiased !important;
            `;
            const badgeIcon = badge.querySelector('svg') as unknown as HTMLElement;
            if (badgeIcon) {
                badgeIcon.style.cssText = 'width: 0.875rem !important; height: 0.875rem !important; flex-shrink: 0 !important;';
            }
        }

        if (metaDate) {
            metaDate.style.cssText = `
                display: flex !important;
                align-items: center !important;
                gap: 8px !important;
                color: rgba(255, 255, 255, 0.9) !important;
                margin-left: 0.1rem !important;
                width: fit-content !important;
                white-space: nowrap !important;
            `;
            const dateIcon = metaDate.querySelector('svg') as unknown as HTMLElement;
            if (dateIcon) {
                dateIcon.style.cssText = 'width: 0.875rem !important; height: 0.875rem !important; flex-shrink: 0 !important; opacity: 0.9 !important;';
            }
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
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(element, {
                scale: 4,
                backgroundColor: null,
                useCORS: true,
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
            this.downloadingQrId = null; // Stop loading
            element.classList.remove('export-mode');
            if (badge) {
                badge.style.cssText = originalBadgeStyle;
                const elements = badge?.querySelectorAll('.export-text') as NodeListOf<HTMLElement> | null;
                elements?.forEach(el => el.classList.remove('export-fix'));
            }
            if (metaDate) {
                metaDate.style.cssText = originalMetaDateStyle;
                const elements = metaDate?.querySelectorAll('.export-text') as NodeListOf<HTMLElement> | null;
                elements?.forEach(el => el.classList.remove('export-fix'));
            }
            if (title) title.style.cssText = originalTitleStyle;
        }
    }
}
