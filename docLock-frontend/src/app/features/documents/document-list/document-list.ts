import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DocumentService } from '../../../core/services/document';
import { ToastService } from '../../../core/services/toast.service';

interface Folder {
    id: string;
    name: string;
    icon: string;
    color: string;
    parentId: string | null;
    itemCount: number;
    createdAt: Date;
}

interface Document {
    id: string;
    name: string;
    type: string;
    size: string;
    date: Date;
    icon: string;
    color: string;
    folderId: string | null; // Allow null for root-level documents
    url?: string;
    webViewLink?: string; // For sharing
}

interface Card {
    id: string;
    name: string;
    type: string;
    number: string;
    expiryDate: string;
    createdAt: Date;
}

interface BreadcrumbItem {
    id: string;
    name: string;
    path: string;
}

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './document-list.html',
    styleUrl: './document-list.css'
})
export class DocumentListComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private documentService = inject(DocumentService);
    private toastService = inject(ToastService);
    viewMode: 'home' | 'folders' | 'cards' | 'qrs' = 'home';
    currentFolderId: string | null = null;
    searchQuery = '';
    showCreateFolderModal = false;
    showUploadModal = false;
    showLocationDropdown = false;
    newFolderName = '';
    selectedLocationId: string | null = null;
    selectedFile: File | null = null;
    documentName = '';
    showFabMenu = false; // FAB menu state

    // Document Actions Menu State
    activeDocumentMenu: string | null = null;

    // Card related properties
    showAddCardModal = false;
    newCardName = '';
    newCardNumber = '';
    newCardExpiry = '';
    newCardType = 'Credit Card';

    // Auto-detected folder properties
    public detectedIcon = 'folder';
    public detectedColor = 'bg-slate-500';

    // Start with empty folders - user creates everything
    folders: Folder[] = [];

    // Start with empty documents - user uploads everything
    documents: Document[] = [];

    // Start with empty cards - user adds everything
    cards: Card[] = [];

    ngOnInit() {
        // Check for query parameters to set initial view mode
        this.route.queryParams.subscribe(params => {
            if (params['view'] === 'cards') {
                this.viewMode = 'cards';
            } else if (params['view'] === 'qrs') {
                this.viewMode = 'qrs';
            }
        });
    }

    get currentFolder(): Folder | null {
        if (!this.currentFolderId) return null;
        return this.folders.find(f => f.id === this.currentFolderId) || null;
    }

    get breadcrumbs(): BreadcrumbItem[] {
        const items: BreadcrumbItem[] = [
            { id: 'root', name: 'My Documents', path: 'root' }
        ];

        if (this.currentFolderId) {
            // Build complete path by traversing up the folder hierarchy
            const pathFolders: Folder[] = [];
            let currentId: string | null = this.currentFolderId;

            while (currentId) {
                const folder = this.folders.find(f => f.id === currentId);
                if (folder) {
                    pathFolders.unshift(folder);
                    currentId = folder.parentId;
                } else {
                    break;
                }
            }

            // Add all folders in the path to breadcrumbs
            pathFolders.forEach(folder => {
                items.push({
                    id: folder.id,
                    name: folder.name,
                    path: folder.id
                });
            });
        }

        return items;
    }

    get currentFolders(): Folder[] {
        return this.folders.filter(f => f.parentId === this.currentFolderId);
    }

    get totalStats() {
        const totalDocs = this.documents.length;
        const totalSize = this.documents.reduce((acc, doc) => {
            const size = parseFloat(doc.size.replace(/[^\d.]/g, ''));
            return acc + size;
        }, 0);

        return {
            documents: totalDocs,
            folders: this.folders.length,
            size: `${totalSize.toFixed(1)}MB`
        };
    }

    get availableLocations(): Folder[] {
        // Return all folders that can be parent folders (excluding current folder if editing)
        return this.folders.filter(f => f.parentId === null);
    }

    get currentDocuments(): Document[] {
        let filtered = this.documents.filter(doc => doc.folderId === this.currentFolderId);

        if (this.searchQuery) {
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        return filtered;
    }

    getTotalItemsCount(): number {
        return this.currentFolders.length + this.currentDocuments.length;
    }

    toggleFabMenu() {
        this.showFabMenu = !this.showFabMenu;
    }

    setViewMode(mode: 'home' | 'folders' | 'cards' | 'qrs') {
        this.viewMode = mode;
        if (mode === 'home') {
            this.currentFolderId = null;
        } else if (mode === 'folders') {
            this.currentFolderId = null;
        }
        // Handle cards and qrs views - for now they work like folders
        // You can implement specific logic for cards and QRs later
    }

    openFolder(folderId: string) {
        this.currentFolderId = folderId;
        this.viewMode = 'folders'; // Stay in folders view, just change current folder
    }

    navigateToBreadcrumb(item: BreadcrumbItem) {
        if (item.id === 'root') {
            this.setViewMode('folders');
        } else {
            this.openFolder(item.id);
        }
    }

    goBack() {
        if (this.currentFolderId) {
            // If we're in a subfolder, go back to parent folder or root
            const currentFolder = this.folders.find(f => f.id === this.currentFolderId);
            if (currentFolder && currentFolder.parentId) {
                this.currentFolderId = currentFolder.parentId;
            } else {
                this.currentFolderId = null;
            }
        } else if (this.viewMode === 'folders') {
            this.setViewMode('home');
        }
    }

    onSearch(event: any) {
        this.searchQuery = event.target.value;
    }

    // Intelligent folder icon and color detection
    detectFolderProperties(folderName: string) {
        const name = folderName.toLowerCase().trim();

        // Define keyword mappings for icons and colors
        const folderMappings = [
            // Identity Documents
            {
                keywords: ['id', 'ids', 'identity', 'passport', 'license', 'driving', 'voter', 'aadhaar', 'aadhar', 'pan', 'identification'],
                icon: 'identification',
                color: 'bg-blue-500'
            },
            // Education
            {
                keywords: ['education', 'school', 'college', 'university', 'marksheet', 'certificate', 'degree', 'diploma', 'academic', 'transcript', 'result'],
                icon: 'academic-cap',
                color: 'bg-emerald-500'
            },
            // Medical/Health
            {
                keywords: ['medical', 'health', 'hospital', 'doctor', 'prescription', 'report', 'test', 'medicine', 'healthcare', 'clinic'],
                icon: 'heart',
                color: 'bg-red-500'
            },
            // Banking/Finance
            {
                keywords: ['bank', 'banking', 'finance', 'financial', 'statement', 'loan', 'credit', 'debit', 'account', 'money', 'payment'],
                icon: 'building-library',
                color: 'bg-violet-500'
            },
            // Insurance
            {
                keywords: ['insurance', 'policy', 'claim', 'coverage', 'premium', 'life insurance', 'health insurance', 'car insurance'],
                icon: 'shield-check',
                color: 'bg-amber-500'
            },
            // Legal
            {
                keywords: ['legal', 'law', 'court', 'agreement', 'contract', 'will', 'property', 'deed', 'lawyer', 'attorney'],
                icon: 'scale',
                color: 'bg-slate-500'
            },
            // Work/Professional
            {
                keywords: ['work', 'job', 'office', 'professional', 'career', 'employment', 'company', 'business', 'corporate'],
                icon: 'briefcase',
                color: 'bg-indigo-500'
            },
            // Personal
            {
                keywords: ['personal', 'private', 'family', 'home', 'household', 'personal documents'],
                icon: 'user',
                color: 'bg-pink-500'
            },
            // Travel
            {
                keywords: ['travel', 'trip', 'vacation', 'flight', 'hotel', 'booking', 'ticket', 'visa', 'tourism'],
                icon: 'airplane',
                color: 'bg-sky-500'
            },
            // Tax
            {
                keywords: ['tax', 'taxes', 'income tax', 'return', 'filing', 'itr', 'tds', 'gst'],
                icon: 'calculator',
                color: 'bg-orange-500'
            },
            // Property/Real Estate
            {
                keywords: ['property', 'real estate', 'house', 'home', 'apartment', 'rent', 'lease', 'mortgage'],
                icon: 'home',
                color: 'bg-green-500'
            },
            // Vehicle
            {
                keywords: ['vehicle', 'car', 'bike', 'motorcycle', 'auto', 'registration', 'rc', 'vehicle documents'],
                icon: 'truck',
                color: 'bg-gray-500'
            }
        ];

        // Find matching category
        for (const mapping of folderMappings) {
            if (mapping.keywords.some(keyword => name.includes(keyword))) {
                this.detectedIcon = mapping.icon;
                this.detectedColor = mapping.color;
                return;
            }
        }

        // Default fallback
        this.detectedIcon = 'folder';
        this.detectedColor = 'bg-slate-500';
    }

    // Called when user types in folder name input
    onFolderNameChange(): void {
        if (this.newFolderName.trim()) {
            this.detectFolderProperties(this.newFolderName);
        } else {
            this.detectedIcon = 'folder';
            this.detectedColor = 'bg-slate-500';
        }
    }

    // Modal functions
    openCreateFolderModal() {
        this.showCreateFolderModal = true;
        this.newFolderName = '';
        this.selectedLocationId = this.currentFolderId; // Default to current location
        this.showLocationDropdown = false;
        this.showFabMenu = false; // Close FAB menu
        // Reset detected properties
        this.detectedIcon = 'folder';
        this.detectedColor = 'bg-slate-500';
    }

    closeCreateFolderModal() {
        this.showCreateFolderModal = false;
        this.newFolderName = '';
        this.selectedLocationId = null;
        this.showLocationDropdown = false;
        // Reset detected properties
        this.detectedIcon = 'folder';
        this.detectedColor = 'bg-slate-500';
    }

    toggleLocationDropdown() {
        this.showLocationDropdown = !this.showLocationDropdown;
    }

    selectLocation(locationId: string | null) {
        this.selectedLocationId = locationId;
        this.showLocationDropdown = false;
    }

    getSelectedLocationPath(): string {
        if (this.selectedLocationId === null) {
            return 'My Documents (Root)';
        }

        const folder = this.folders.find(f => f.id === this.selectedLocationId);
        return folder ? folder.name : 'My Documents (Root)';
    }

    createFolder() {
        if (!this.newFolderName.trim()) return;

        // Use detected icon and color
        const newFolder: Folder = {
            id: Date.now().toString(),
            name: this.newFolderName.trim(),
            icon: this.detectedIcon,
            color: this.detectedColor,
            parentId: this.selectedLocationId,
            itemCount: 0,
            createdAt: new Date()
        };

        this.folders.push(newFolder);
        this.closeCreateFolderModal();
    }

    openUploadModal() {
        this.showUploadModal = true;
        this.selectedFile = null;
        this.documentName = '';
        this.showFabMenu = false; // Close FAB menu
    }

    closeUploadModal() {
        this.showUploadModal = false;
        this.selectedFile = null;
        this.documentName = '';
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            this.documentName = file.name;
        }
    }

    uploadDocument() {
        if (!this.selectedFile) return;

        const newDocument: Document = {
            id: Date.now().toString(),
            name: this.documentName || this.selectedFile.name,
            type: this.selectedFile.type.split('/')[1].toUpperCase(),
            size: `${(this.selectedFile.size / (1024 * 1024)).toFixed(1)} MB`,
            date: new Date(),
            icon: 'document',
            color: 'bg-blue-500',
            folderId: this.currentFolderId // Can be null for root level
        };

        this.documents.push(newDocument);

        // Update folder item count if uploading to a folder
        if (this.currentFolderId) {
            const folder = this.folders.find(f => f.id === this.currentFolderId);
            if (folder) {
                folder.itemCount++;
            }
        }

        this.closeUploadModal();
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
        const index = this.documents.findIndex(d => d.id === doc.id);
        if (index > -1) {
            this.documents.splice(index, 1);

            // Update folder item count
            const folder = this.folders.find(f => f.id === doc.folderId);
            if (folder && folder.itemCount > 0) {
                folder.itemCount--;
            }
        }
    }

    deleteFolder(folder: Folder) {
        // Delete all documents in the folder
        this.documents = this.documents.filter(doc => doc.folderId !== folder.id);

        // Delete the folder
        const index = this.folders.findIndex(f => f.id === folder.id);
        if (index > -1) {
            this.folders.splice(index, 1);
        }
    }

    getIconSvg(iconName: string): string {
        const icons: { [key: string]: string } = {
            'identification': 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zM6.75 9.75h2.25v2.25H6.75V9.75z',
            'academic-cap': 'M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5',
            'heart': 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z',
            'building-library': 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z',
            'shield-check': 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
            'scale': 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L18.75 4.97zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L5.25 4.97z',
            'briefcase': 'M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z',
            'user': 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z',
            'airplane': 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25V13.5a2.25 2.25 0 00-2.25-2.25H15a3 3 0 01-3-3V5.25a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v1.5z',
            'calculator': 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008V18H8.25v-.008zM12 13.5h.008v.008H12V13.5zm0 2.25h.008v.008H12v-.008zm0 2.25h.008V18H12v-.008zM15.75 13.5h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zM6 7.5h12A1.5 1.5 0 0119.5 9v10.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 016 7.5zM10.5 4.5a.75.75 0 00-.75.75v.75h4.5v-.75a.75.75 0 00-.75-.75h-3z',
            'home': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
            'truck': 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125A1.125 1.125 0 0021 17.625v-3.375m-9-3.75h5.25m0 0V8.25a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v1.5m5.25-1.5a1.5 1.5 0 00-1.5-1.5H9.75a1.5 1.5 0 00-1.5 1.5v1.5M12 9.75v1.5m0-1.5h3.75m-3.75 0H8.25',
            'folder': 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
            'document': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z'
        };
        return icons[iconName] || icons['folder'];
    }

    // Card Management Methods
    openAddCardModal() {
        this.showAddCardModal = true;
        this.newCardName = '';
        this.newCardNumber = '';
        this.newCardExpiry = '';
        this.newCardType = 'Credit Card';
        this.showFabMenu = false;
    }

    closeAddCardModal() {
        this.showAddCardModal = false;
        this.newCardName = '';
        this.newCardNumber = '';
        this.newCardExpiry = '';
        this.newCardType = 'Credit Card';
    }

    addCard() {
        if (!this.newCardName.trim() || !this.newCardNumber.trim()) return;

        const newCard: Card = {
            id: Date.now().toString(),
            name: this.newCardName.trim(),
            type: this.newCardType,
            number: this.newCardNumber.trim(),
            expiryDate: this.newCardExpiry,
            createdAt: new Date()
        };

        this.cards.push(newCard);
        this.closeAddCardModal();
    }

    deleteCard(cardId: string) {
        const index = this.cards.findIndex(c => c.id === cardId);
        if (index > -1) {
            this.cards.splice(index, 1);
        }
    }

    // Enhanced delete methods for folders and documents
    confirmDeleteFolder(folder: Folder) {
        if (confirm(`Are you sure you want to delete "${folder.name}" and all its contents?`)) {
            this.deleteFolder(folder);
        }
    }

    confirmDeleteDocument(doc: Document) {
        if (confirm(`Are you sure you want to delete "${doc.name}"?`)) {
            this.deleteDocument(doc);
        }
    }

    confirmDeleteCard(card: Card) {
        if (confirm(`Are you sure you want to delete "${card.name}"?`)) {
            this.deleteCard(card.id);
        }
    }

    // Document Actions Menu Methods
    toggleDocumentMenu(docId: string) {
        this.activeDocumentMenu = this.activeDocumentMenu === docId ? null : docId;
    }

    closeDocumentMenu() {
        this.activeDocumentMenu = null;
    }
}