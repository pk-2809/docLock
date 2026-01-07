import { Component, inject, OnInit, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Document } from '../../core/services/document';
import { SafeUrlPipe } from './safe-url.pipe';
import { QrService, QRCode } from '../../core/services/qr';

@Component({
    selector: 'app-public-access',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './public-access.html',
    styleUrl: './public-access.css'
})
export class PublicAccessComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private qrService = inject(QrService);
    private router = inject(Router);

    // State
    isLoading = signal(true);
    error = signal('');
    qrId: string | null = null;
    qrName = signal(''); // Store name if available (can't get it before MPIN unless we have public info endpoint)
    // Actually, getting Name before MPIN might be nice. 
    // Backend verifyAccess returns data. verifyMpin returns Token.
    // We don't have a "getPublicInfo" endpoint yet (returns name only).
    // For now, Name will appear AFTER unlock or we just show "Secure Access".

    linkedDocuments = signal<Document[]>([]);
    sessionToken: string | null = null;

    // MPIN State
    isAuthenticated = signal(false);
    mpinInput = signal('');
    mpinError = signal('');
    isVerifying = signal(false);

    // View State
    showPreview = signal(false);
    previewDoc: any = null; // Can be Document + Content
    previewUrl: string | null = null;
    viewUrl: string | null = null;

    ngOnInit() {
        // cleaned up logic - strict backend dependence
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.qrId = id;
            this.isLoading.set(false);
        } else {
            this.error.set('Invalid Link');
            this.isLoading.set(false);
        }
    }

    // Keypad Logic
    onKeyPress(key: number) {
        if (this.isAuthenticated()) return;

        if (key === -2) { // Backspace
            this.mpinInput.update(v => v.slice(0, -1));
            this.mpinError.set('');
        } else if (key !== -1) {
            if (this.mpinInput().length < 4) {
                this.mpinInput.update(v => v + key);
                // Auto-submit
                if (this.mpinInput().length === 4) {
                    setTimeout(() => this.validateMpin(), 200);
                }
            }
        }
    }

    validateMpin() {
        if (!this.qrId) return;
        this.isVerifying.set(true);

        this.qrService.verifyMpin(this.qrId, this.mpinInput()).subscribe({
            next: (res) => {
                this.sessionToken = res.token;
                this.isAuthenticated.set(true);
                this.loadDocuments();
                this.isVerifying.set(false);
            },
            error: (err) => {
                const msg = err.error?.error || 'Incorrect PIN';
                this.mpinError.set(msg);
                this.shakeKeypad();
                this.mpinInput.set('');
                this.isVerifying.set(false);
            }
        });
    }

    shakeKeypad() {
        const keypad = document.querySelector('.keypad-grid');
        keypad?.classList.add('shake');
        setTimeout(() => keypad?.classList.remove('shake'), 400);
    }

    loadDocuments() {
        if (!this.sessionToken) return;
        this.isLoading.set(true);

        this.qrService.getPublicDocuments(this.sessionToken).subscribe({
            next: (res) => {
                this.linkedDocuments.set(res.documents);
                this.isLoading.set(false);
            },
            error: () => {
                this.error.set('Failed to load documents');
                this.isLoading.set(false);
            }
        });
    }

    // Document Logic
    getDocIcon(mimeType: string): string {
        if (mimeType?.includes('pdf')) return 'description';
        if (mimeType?.includes('image')) return 'image';
        return 'article';
    }

    private cdr = inject(ChangeDetectorRef); // Injected

    // PDF State
    private pdfDoc: any = null;
    pdfPages: { url: string; width: number; height: number }[] = [];
    isPdf = false;
    isImage = false;

    openPreview(doc: Document) {
        if (!this.sessionToken) return;
        this.previewDoc = doc;
        this.showPreview.set(true);
        this.pdfPages = [];

        this.isPdf = Boolean(doc.mimeType?.includes('pdf'));
        this.isImage = Boolean(doc.mimeType?.includes('image'));

        // Fetch Signed URL (Direct Cloud Storage Link)
        this.qrService.getPublicDocumentUrl(this.sessionToken, doc.id).subscribe({
            next: async (res) => {
                this.previewUrl = res.downloadUrl;
                this.viewUrl = null;

                if (this.isPdf) {
                    // PDF.js can load directly from URL
                    // Note: Firebase Storage CORS must be configured to allow this domain
                    await this.renderPdf(this.previewUrl);
                }

                // Fallback for native view
                if (doc.driveFileId) {
                    this.viewUrl = `https://drive.google.com/file/d/${doc.driveFileId}/view`;
                }

                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('URL Fetch Failed', err);

                // Fallback to Drive View Link
                if (doc.driveFileId) {
                    this.viewUrl = `https://drive.google.com/file/d/${doc.driveFileId}/view`;
                }

                const mockContent = `Failed to load content. Please try again.`;
                const blob = new Blob([mockContent], { type: 'text/plain' });
                this.previewUrl = window.URL.createObjectURL(blob);
                this.cdr.detectChanges();
            }
        });
    }

    async renderPdf(url: string) {
        try {
            const pdfjsLib = await import('pdfjs-dist');
            pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

            const loadingTask = pdfjsLib.getDocument(url);
            this.pdfDoc = await loadingTask.promise;
            this.pdfPages = [];

            const numPages = this.pdfDoc.numPages;

            for (let i = 1; i <= numPages; i++) {
                const page = await this.pdfDoc.getPage(i);
                const viewport = page.getViewport({ scale: 1.5 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context!,
                    viewport: viewport
                }).promise;

                this.pdfPages.push({
                    url: canvas.toDataURL(),
                    width: viewport.width,
                    height: viewport.height
                });
            }
        } catch (error) {
            console.error('Error rendering PDF:', error);
        }
    }

    closePreview() {
        this.showPreview.set(false);
        this.previewDoc = null;
        // No ObjectURL to revoke anymore for main content (except fallback error blob)
        this.previewUrl = null;
    }

    // UI Controls for Full Screen Mode
    showControls = true;

    toggleControls() {
        this.showControls = !this.showControls;
    }

    async shareDoc(doc: Document) {
        if (!doc) return;

        const shareData: ShareData = {
            title: doc.name,
            text: `Secure Document shared via DocLock: ${doc.name}`,
            url: window.location.href // Or a specific direct link if we had one
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                alert('Link copied to clipboard');
            }
        } catch (err) {
            console.error('Share failed', err);
        }
    }

    downloadDoc(doc: Document) {
        if (!this.sessionToken) return;

        // Get Signed URL
        this.qrService.getPublicDocumentUrl(this.sessionToken, doc.id).subscribe({
            next: (res) => {
                const link = document.createElement('a');
                link.href = res.downloadUrl;
                // 'download' attribute only works for same-origin or blob/data: URLs usually
                // But Cloud Storage content-disposition might handle it.
                link.setAttribute('download', doc.name);
                link.target = '_blank'; // Safer for cross-origin
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            },
            error: (err) => {
                console.error('Download failed', err);
                alert('Failed to download document. Please try again.');
            }
        });
    }
}

