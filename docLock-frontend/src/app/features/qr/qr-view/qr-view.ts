import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { DocumentService, Document } from '../../../core/services/document';
// Reuse the interface from list to keep things consistent (in real app, move to models file)
interface QRCode {
    id: string;
    name: string;
    createdAt: Date;
    linkedDocumentIds: string[];
    scanCount: number;
}

@Component({
    selector: 'app-qr-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-view.html',
    styleUrl: './qr-view.css'
})
export class QrViewComponent implements OnInit {
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private documentService = inject(DocumentService);

    qrCode: QRCode | null = null;
    linkedDocuments: Document[] = [];
    isLoading = true;
    error = '';

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['id'];
            this.loadQrAndDocs(id);
        });
    }

    loadQrAndDocs(qrId: string) {
        this.isLoading = true;
        this.error = '';

        // 1. Find the QR Code (Mock Storage)
        const saved = localStorage.getItem('my_mock_qrs');
        if (saved) {
            const qrCodes: QRCode[] = JSON.parse(saved);
            this.qrCode = qrCodes.find(q => q.id === qrId) || null;
        }

        if (!this.qrCode) {
            this.error = 'QR Code not found or has expired.';
            this.isLoading = false;
            return;
        }

        // 2. Load Documents (In real app, backend filters this. Here we fetch all and filter client-side)
        this.documentService.getDocuments().subscribe({
            next: (res) => {
                const allDocs = res.documents;
                this.linkedDocuments = allDocs.filter(d => this.qrCode?.linkedDocumentIds.includes(d.id));
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load documents', err);
                this.error = 'Failed to load linked documents.';
                this.isLoading = false;
            }
        });
    }

    goBack() {
        this.router.navigate(['/qrs']);
    }

    downloadDoc(doc: Document) {
        // Implement download logic or link
        this.documentService.downloadDocument(doc.id, doc.name).subscribe(blob => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        });
    }

    formatDate(date: string | Date): string {
        return new Date(date).toLocaleDateString();
    }
}