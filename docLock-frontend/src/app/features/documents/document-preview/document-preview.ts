import { Component, OnInit, OnDestroy, inject, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentService, Document } from '../../../core/services/document';
import { ToastService } from '../../../core/services/toast.service';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';
import { ShareBottomSheetComponent } from '../../../shared/components/share-bottom-sheet/share-bottom-sheet';
import { PeopleService } from '../../../core/people/people.service';
import { AuthService } from '../../../core/auth/auth';

@Component({
    selector: 'app-document-preview',
    standalone: true,
    imports: [CommonModule, BottomSheetComponent, ShareBottomSheetComponent],
    templateUrl: './document-preview.html',
    styleUrl: './document-preview.css'
})
export class DocumentPreviewComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private documentService = inject(DocumentService);
    private toastService = inject(ToastService);
    private sanitizer = inject(DomSanitizer);
    private cdr = inject(ChangeDetectorRef);
    private peopleService = inject(PeopleService);
    private authService = inject(AuthService);

    documentId: string | null = null;
    document: Document | null = null;
    isLoading = true;

    // Share Sheet State
    showShareSheet = false;
    itemToShare: { id: string, name: string, type: 'document' | 'card' } | null = null;

    // Preview State
    previewUrl: SafeResourceUrl | string | null = null;
    blobUrl: string | null = null;
    isImage = false;
    isPdf = false;
    showControls = true;

    // Gesture State
    scale = 1;
    panX = 0;
    panY = 0;
    isZoomed = false;

    private lastX = 0;
    private lastY = 0;
    private initialDistance = 0;
    private initialScale = 1;
    private isDragging = false;
    private activePointers = 0;

    returnFolderId: string | null = null;

    ngOnInit() {
        this.documentId = this.route.snapshot.paramMap.get('id');

        const user = this.authService.user();
        if (user) {
            this.peopleService.subscribeToFriends(user.uid);
        }

        // precise capture of query params
        this.route.queryParams.subscribe(params => {
            this.returnFolderId = params['folderId'] || null;
        });

        // Check for preloaded data from navigation state
        const state = history.state;

        if (this.documentId) {
            if (state && state['preloadedUrl'] && state['document']) {
                // Use preloaded data for instant rendering
                this.isLoading = false; // No loading needed - content is ready!
                this.document = state['document'];
                this.determineFileType();
                this.loadPreloadedContent(state['preloadedUrl']);
            } else {
                // Fallback: Load normally
                this.loadDocument(this.documentId);
            }
        } else {
            this.goBack();
        }
    }

    ngOnDestroy() {
        // Cleanup Blob URL to prevent memory leaks
        if (this.blobUrl) {
            URL.revokeObjectURL(this.blobUrl);
        }
    }

    loadDocument(id: string) {
        this.isLoading = true;
        this.documentService.getDocument(id).subscribe({
            next: (res) => {
                this.document = res.document;
                this.determineFileType();
                this.fetchContent(id);
            },
            error: (err) => {
                console.error('Error fetching document metadata:', err);
                // Fallback: Try to fetch content directly if metadata fails (rare case)
                this.toastService.showError('Could not load document details');
                this.goBack();
            }
        });
    }

    async loadPreloadedContent(url: string) {
        console.log('Using preloaded content:', url);
        this.blobUrl = url;

        if (this.isPdf) {
            // PDF.js can load directly from URL
            await this.renderPdf(url);
        } else {
            // Images and others can be displayed directly
            this.previewUrl = url;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
    }

    determineFileType() {
        if (!this.document) return;
        const mime = this.document.mimeType?.toLowerCase();
        const name = this.document.name?.toLowerCase();

        this.isImage = Boolean(mime?.startsWith('image/') || hasExtension(name, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp']));
        this.isPdf = Boolean(mime === 'application/pdf' || hasExtension(name, ['pdf']));

        function hasExtension(filename: string, exts: string[]) {
            return filename && exts.some(ext => filename.endsWith('.' + ext));
        }
    }

    // PDF State
    private pdfDoc: any = null;
    pdfPages: { url: string; width: number; height: number }[] = [];

    async fetchContent(id: string) {
        console.log('Fetching content for:', id);
        this.documentService.downloadDocument(id, this.document?.name || 'file')
            .subscribe({
                next: async (res) => {
                    console.log('Content URL received:', res.downloadUrl);
                    // Store URL for download
                    this.blobUrl = res.downloadUrl; // Reusing variable name for now, though it's a signed URL

                    if (this.isPdf) {
                        // PDF.js can load directly from URL
                        await this.renderPdf(res.downloadUrl);
                    } else {
                        // Images and others can be displayed directly
                        this.previewUrl = res.downloadUrl;
                    }
                    this.isLoading = false;
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error fetching document content:', err);
                    this.toastService.showError('Could not load document content');
                    this.isLoading = false;
                    this.cdr.detectChanges();

                    // Navigate back after a brief delay to show error message
                    setTimeout(() => {
                        this.goBack();
                    }, 2000);
                },
                complete: () => {
                    this.isLoading = false;
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

            // Render first 5 pages max for now to avoid memory issues on mobile
            // Or render all if small. Let's try all but be careful.
            const numPages = this.pdfDoc.numPages;

            for (let i = 1; i <= numPages; i++) {
                const page = await this.pdfDoc.getPage(i);

                // Set scale for high quality (mobile screens are high density)
                const viewport = page.getViewport({ scale: 2 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context!,
                    viewport: viewport
                };

                await page.render(renderContext).promise;
                this.pdfPages.push({
                    url: canvas.toDataURL(),
                    width: viewport.width,
                    height: viewport.height
                });
            }
            // Trigger gesture reset or fit to screen
            this.scale = 1;
        } catch (error) {
            console.error('Error rendering PDF:', error);
            this.toastService.showError('Could not render PDF');
        }
    }

    goBack() {
        if (this.returnFolderId) {
            this.router.navigate(['/documents'], { queryParams: { folderId: this.returnFolderId } });
        } else {
            this.router.navigate(['/documents']);
        }
    }

    toggleControls() {
        this.showControls = !this.showControls;
    }

    downloadFile() {
        if (!this.blobUrl || !this.document) return;

        const link = document.createElement('a');
        link.href = this.blobUrl;
        link.download = this.document.name;
        link.target = '_blank'; // Important for Signed URLs
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.toastService.showSuccess('Download started');
    }

    // Share Logic
    async shareDocument() {
        if (!this.document) return;

        this.itemToShare = {
            id: this.document.id,
            name: this.document.name,
            type: 'document'
        };
        this.showShareSheet = true;
    }

    // Delete Logic (Bottom Sheet)
    showDeleteSheet = false;
    isDeleting = false;

    confirmDelete() {
        this.showDeleteSheet = true;
    }

    cancelDelete() {
        if (this.isDeleting) return;
        this.showDeleteSheet = false;
    }

    deleteFile() {
        if (!this.document) return;

        this.isDeleting = true;
        this.cdr.detectChanges(); // Force update to show loader immediately

        this.documentService.deleteDocument(this.document.id, this.document.driveFileId, this.document.size).subscribe({
            next: () => {
                this.toastService.showSuccess('File deleted');
                // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError if rapid updates occur
                setTimeout(() => {
                    this.isDeleting = false;
                    this.showDeleteSheet = false;
                    this.goBack();
                });
            },
            error: (err) => {
                this.toastService.showError('Failed to delete file');
                this.isDeleting = false;
                // Keep sheet open so user can retry or cancel
                this.cdr.detectChanges();
            }
        });
    }

    // --- GESTURE HANDLING (pinch-zoom & pan) ---

    // Mouse Events for testing on desktop
    onMouseDown(e: MouseEvent) {
        if (!this.isZoomed) return;
        e.preventDefault();
        this.isDragging = true;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    @HostListener('window:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {
        if (!this.isDragging || !this.isZoomed) return;
        e.preventDefault();
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.panX += dx;
        this.panY += dy;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
    }

    @HostListener('window:mouseup')
    onMouseUp() {
        this.isDragging = false;
    }

    // Touch Events
    onTouchStart(e: TouchEvent) {
        this.activePointers = e.touches.length;

        if (e.touches.length === 1) {
            // Pan
            if (this.isZoomed) {
                this.isDragging = true;
                this.lastX = e.touches[0].clientX;
                this.lastY = e.touches[0].clientY;
            }
        } else if (e.touches.length === 2) {
            // Pinch Zoom Start
            this.isDragging = false;
            this.initialDistance = this.getDistance(e.touches);
            this.initialScale = this.scale;
        }
    }

    onTouchMove(e: TouchEvent) {
        // Allow native scrolling for unzoomed PDF
        if (this.isPdf && !this.isZoomed) return;

        // Prevent generic browser zooming/scrolling for Images or when Zoomed
        if (e.cancelable) e.preventDefault();

        if (e.touches.length === 1 && this.isDragging && this.isZoomed) {
            const dx = e.touches[0].clientX - this.lastX;
            const dy = e.touches[0].clientY - this.lastY;
            this.panX += dx;
            this.panY += dy;
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
            this.lastX = e.touches[0].clientX; // double update safety
            this.lastY = e.touches[0].clientY;

            // Prevent scrolling while panning image
            if (e.cancelable) e.preventDefault();

        } else if (e.touches.length === 2) {
            // Pinch Zooming
            if (e.cancelable) e.preventDefault();

            const currentDistance = this.getDistance(e.touches);
            if (this.initialDistance > 0) {
                const delta = currentDistance / this.initialDistance;
                let newScale = this.initialScale * delta;

                // Clamp scale
                newScale = Math.min(Math.max(1, newScale), 4);
                this.scale = newScale;
                this.isZoomed = this.scale > 1.1;

                // Reset pan if zoomed out
                if (!this.isZoomed) {
                    this.panX = 0;
                    this.panY = 0;
                }
            }
        }
    }

    onTouchEnd(e: TouchEvent) {
        this.activePointers = e.touches.length;
        if (this.activePointers === 0) {
            this.isDragging = false;
            // Snap back if scale < 1 (not implemented fully here, assuming min 1)
        }
    }

    private getDistance(touches: TouchList): number {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}
