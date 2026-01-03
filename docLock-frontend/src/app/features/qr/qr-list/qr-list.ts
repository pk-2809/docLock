import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DocumentService, Document } from '../../../core/services/document';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';

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
    imports: [CommonModule, FormsModule, RouterLink],
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
        this.newQrName = '';
        this.selectedDocumentIds.clear();
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
        // Navigate to the view page
        this.router.navigate(['/qr/view', qr.id]);
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

    // New: Helper for the colorful grid design
    // Wallet Theme Gradients
    getCardGradient(index: number): string {
        const gradients = [
            'bg-gradient-to-br from-blue-600 to-purple-700',      // Deep Blue/Purple
            'bg-gradient-to-br from-emerald-500 to-teal-600',     // Green/Teal
            'bg-gradient-to-br from-orange-500 to-pink-600',      // Sunset
            'bg-gradient-to-br from-slate-700 to-slate-900',      // Dark Mode
            'bg-gradient-to-br from-indigo-500 to-blue-600'       // Indigo
        ];
        return gradients[index % gradients.length];
    }

    // New: Helper to get QR Image URL
    generateQRCode(data: string): string {
        const size = 150;
        const encodedData = encodeURIComponent(data);
        return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedData}&margin=0`;
    }
}
