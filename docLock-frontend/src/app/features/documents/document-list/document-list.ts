import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DocumentService, Document } from '../../../core/services/document';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './document-list.html',
    styleUrl: './document-list.css'
})
export class DocumentListComponent implements OnInit {
    private documentService = inject(DocumentService);
    private toastService = inject(ToastService);

    viewMode: 'home' | 'grid' | 'list' = 'home';
    searchQuery = '';
    selectedCategory = 'all';

    categories = [
        { id: 'all', name: 'All Documents', icon: '📁', count: 0 },
        { id: 'Personal', name: 'Personal', icon: '👤', count: 0 },
        { id: 'Work', name: 'Work', icon: '💼', count: 0 },
        { id: 'Finance', name: 'Finance', icon: '💰', count: 0 },
        { id: 'Health', name: 'Health', icon: '🏥', count: 0 },
        { id: 'Other', name: 'Other', icon: '📄', count: 0 }
    ];

    documents: Document[] = [];
    isLoading = signal(false);

    ngOnInit() {
        this.loadDocuments();
    }

    loadDocuments() {
        this.isLoading.set(true);
        this.documentService.getDocuments().subscribe({
            next: (res) => {
                this.documents = res.documents.map(doc => ({
                    ...doc,
                    // Map backend fields to UI fields if needed, or just extend
                    type: this.getTypeFromMime(doc.mimeType), // simple type like 'PDF'
                    date: new Date(doc.createdAt || Date.now()),
                    icon: this.getIconForType(doc.mimeType),
                    color: this.getColorForType(doc.mimeType)
                })) as any; // Cast to any to satisfy the localized interface or update interface
                this.updateCategoryCounts();
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load documents', err);
                this.toastService.showError('Failed to load documents');
                this.isLoading.set(false);
            }
        });
    }

    getTypeFromMime(mime: string): string {
        if (mime.includes('pdf')) return 'PDF';
        if (mime.includes('image')) return 'IMG';
        if (mime.includes('word')) return 'DOC';
        return 'FILE';
    }

    getIconForType(mime: string): string {
        if (mime.includes('pdf')) return '📄'; // or 🛂 depending on category
        if (mime.includes('image')) return '🖼️';
        return '📄';
    }

    getColorForType(mime: string): string {
        if (mime.includes('pdf')) return 'from-red-500 to-orange-500';
        if (mime.includes('image')) return 'from-blue-500 to-cyan-500';
        return 'from-slate-500 to-gray-500';
    }

    updateCategoryCounts() {
        const counts: { [key: string]: number } = {};
        this.documents.forEach(doc => {
            const cat = doc.category || 'Other';
            counts[cat] = (counts[cat] || 0) + 1;
        });

        this.categories.forEach(c => {
            if (c.id === 'all') c.count = this.documents.length;
            else c.count = counts[c.id] || 0;
        });
    }

    get filteredDocuments(): Document[] {
        let filtered = this.documents;

        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(doc => (doc.category || 'Other') === this.selectedCategory);
        }

        if (this.searchQuery) {
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        return filtered;
    }

    setViewMode(mode: 'home' | 'grid' | 'list') {
        this.viewMode = mode;
    }

    toggleViewMode() {
        if (this.viewMode === 'home') return;
        this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    }

    selectCategory(categoryId: string) {
        this.selectedCategory = categoryId;
    }

    onSearch(event: any) {
        this.searchQuery = event.target.value;
    }

    // Handlers
    triggerUpload() {
        const fileInput = document.getElementById('fileInput') as HTMLInputElement;
        if (fileInput) fileInput.click();
    }

    onFileSelected(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];

            // Determine category based on current filter or ask user?
            // For MVP, default to 'Personal' or selected category if standard
            let category = 'Personal';
            if (this.selectedCategory !== 'all') category = this.selectedCategory;

            this.toastService.showSuccess(`Uploading ${file.name}...`);
            this.isLoading.set(true);

            this.documentService.uploadDocument(file, category).subscribe({
                next: (res) => {
                    this.toastService.showSuccess('Document uploaded successfully');
                    const newDoc = {
                        ...res.document,
                        type: this.getTypeFromMime(res.document.mimeType),
                        date: new Date(res.document.createdAt || Date.now()),
                        icon: this.getIconForType(res.document.mimeType),
                        color: this.getColorForType(res.document.mimeType)
                    };
                    this.documents.unshift(newDoc);
                    this.updateCategoryCounts();
                    this.isLoading.set(false);
                },
                error: (err) => {
                    console.error('Upload failed', err);
                    this.toastService.showError('Failed to upload document');
                    this.isLoading.set(false);
                }
            });
        }
    }

    downloadDocument(doc: Document) {
        this.toastService.showSuccess(`Downloading ${doc.name}...`);
        this.documentService.downloadDocument(doc.id, doc.name).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = doc.name;
                link.click();
                window.URL.revokeObjectURL(url);
                this.toastService.showSuccess('Download complete');
            },
            error: (err: any) => {
                console.error('Download failed', err);
                this.toastService.showError('Failed to download document');
            }
        });
    }

    shareDocument(doc: Document) {
        if (doc.webViewLink) {
            navigator.clipboard.writeText(doc.webViewLink);
            this.toastService.showSuccess('Link copied to clipboard');
        }
    }

    deleteDocument(doc: Document) {
        if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
            this.toastService.showSuccess('Deleting document...');
            this.documentService.deleteDocument(doc.id, doc.driveFileId, doc.size).subscribe({
                next: () => {
                    this.documents = this.documents.filter(d => d.id !== doc.id);
                    this.updateCategoryCounts();
                    this.toastService.showSuccess('Document deleted');
                },
                error: (err) => {
                    console.error('Delete failed', err);
                    this.toastService.showError('Failed to delete document');
                }
            });
        }
    }
}
