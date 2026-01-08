import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification.service';
import { DocumentService, Document, Folder } from '../../../core/services/document';
import { ToastService } from '../../../core/services/toast.service';
import { finalize } from 'rxjs';
import { AppConfigService } from '../../../core/services/app-config.service';
import { ShareBottomSheetComponent } from '../../../shared/components/share-bottom-sheet/share-bottom-sheet';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';
import { DynamicSheetComponent } from '../../../shared/components/dynamic-sheet/dynamic-sheet';
import { SheetConfig } from '../../../shared/models/ui.models';
import { PeopleService } from '../../../core/people/people.service';
import { CardService, Card } from '../../../core/services/card';
import { IconMappingService } from '../../../core/services/icon-mapping.service';
import { InputSanitizerService } from '../../../core/services/input-sanitizer.service';

interface BreadcrumbItem {
    id: string;
    name: string;
    path: string;
}

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, FormsModule, ShareBottomSheetComponent, BottomSheetComponent, DynamicSheetComponent],
    templateUrl: './document-list.html',
    styleUrl: './document-list.css'
})
export class DocumentListComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('breadcrumbContainer') breadcrumbContainer!: ElementRef;

    private route = inject(ActivatedRoute);
    private documentService = inject(DocumentService);
    private toastService = inject(ToastService);
    public appConfig = inject(AppConfigService); // Changed to public to access in template
    private cardService = inject(CardService);
    router = inject(Router);
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    private peopleService = inject(PeopleService);
    private cdr = inject(ChangeDetectorRef);
    private iconMappingService = inject(IconMappingService);
    private inputSanitizer = inject(InputSanitizerService);

    // State
    isFetchingNotifications = false;
    viewMode: 'folders' | 'cards' | 'card-folder' | 'qrs' = 'folders';
    currentFolderId: string | null = null;
    currentCardFolder: 'debit' | 'credit' | null = null;
    searchQuery = '';

    // UI States
    isLoading = false; // Data is handled by real-time signals
    isUploading = false;
    isDeleting = false;
    loadingDocumentId: string | null = null; // Track which document is loading

    showCreateFolderModal = false;
    showUploadModal = false;
    showLocationDropdown = false;
    showDeleteSheet = false;

    itemToDelete: { type: 'document' | 'folder', data: any } | null = null;
    deleteMessage = '';
    newFolderName = '';
    selectedLocationId: string | null = null;
    selectedFile: File | null = null;
    documentName = '';
    showFabMenu = false;

    // Document Actions Menu State
    activeDocumentMenu: string | null = null;
    activeFolderMenu: string | null = null;

    // Folder Editing State
    editFolderId: string | null = null;
    editFolderName = '';

    // Card related properties
    showAddCardBottomSheet = false;
    editingCard: Card | null = null;
    newCardName = '';
    newCardNumber = '';
    newCardExpiry = '';
    newCardCvv = '';
    newCardType = 'Credit Card';
    showCardCVV = new Set<string>();

    // Share Sheet State
    showShareSheet = false;
    itemToShare: { id: string, name: string, type: 'document' | 'card' } | null = null;

    // Auto-detected folder properties
    public detectedIcon = 'folder';
    public detectedColor = 'bg-blue-50';

    // Search Panel State
    showSearchPanel = false;
    searchResults: { doc: Document, path: string }[] = [];

    // Dashboard Data Constants
    readonly storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB
    readonly cardLimit = 50;
    readonly qrLimit = 20;

    // Interactive chart state
    selectedChartStat: 'storage' | 'cards' | 'qrs' = 'storage';

    // Data Accessors (Signals)
    get folders() { return this.documentService.folders(); }
    get documents() { return this.documentService.documents(); }
    get cards() { return this.cardService.cards(); }

    ngOnInit() {
        // Check for query parameters to set initial view mode
        this.route.queryParams.subscribe(params => {
            if (params['view'] === 'cards') {
                this.viewMode = 'cards';
            } else if (params['view'] === 'qrs') {
                this.viewMode = 'qrs';
            } else if (params['folderId']) {
                this.openFolder(params['folderId']);
            }
        });
    }

    ngAfterViewInit() {
        // Auto-scroll breadcrumb to the end when it has many items
        setTimeout(() => {
            if (this.breadcrumbContainer && this.breadcrumbs.length > 3) {
                const container = this.breadcrumbContainer.nativeElement;
                const breadcrumbPath = container.querySelector('.overflow-x-auto');
                if (breadcrumbPath) {
                    breadcrumbPath.scrollLeft = breadcrumbPath.scrollWidth;
                }
            }
        }, 100);
    }

    ngOnDestroy() {
        // Cleanup if any
    }

    // --- Computed Properties ---

    get currentFolder(): Folder | null {
        if (!this.currentFolderId) return null;
        return this.folders.find(f => f.id === this.currentFolderId) || null;
    }

    get breadcrumbs(): BreadcrumbItem[] {
        const items: BreadcrumbItem[] = [
            { id: 'root', name: 'My Documents', path: 'root' }
        ];

        if (this.currentFolderId) {
            if (this.currentFolderId === 'shared-folder') {
                items.push({
                    id: 'shared-folder',
                    name: 'Shared',
                    path: 'shared-folder'
                });
            } else {
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

                pathFolders.forEach(folder => {
                    items.push({
                        id: folder.id,
                        name: folder.name,
                        path: folder.id
                    });
                });
            }
        }
        return items;
    }

    get currentFolders(): Folder[] {
        let regularFolders = this.folders.filter(f => f.parentId === this.currentFolderId);

        // Add "Shared" folder at the top if at root and shared docs exist
        if (this.currentFolderId === null && this.hasSharedDocuments()) {
            regularFolders = regularFolders.filter(f => f.name.toLowerCase() !== 'shared');
            const sharedFolder: Folder = {
                id: 'shared-folder',
                name: 'Shared',
                parentId: null,
                icon: 'share',
                color: 'bg-gradient-to-br from-blue-500 to-indigo-600',
                itemCount: this.getSharedDocumentsCount(),
                createdAt: new Date().toISOString()
            };
            return [sharedFolder, ...regularFolders];
        }

        return regularFolders;
    }

    get isSharedFolder(): boolean {
        return this.currentFolderId === 'shared-folder' ||
            (this.currentFolderId !== null && this.folders.find(f => f.id === this.currentFolderId)?.name?.toLowerCase() === 'shared');
    }

    get availableLocations(): Folder[] {
        return this.folders.filter(f => f.parentId === null);
    }

    get currentDocuments(): Document[] {
        let filtered: Document[];


        if (this.currentFolderId === 'shared-folder') {
            filtered = this.documents.filter(doc => this.isSharedDocument(doc));
        } else {
            filtered = this.documents.filter(doc => doc.folderId === this.currentFolderId);
        }

        return filtered;
    }

    get dashboardStats() {
        const totalSize = this.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
        const storageUsedGB = totalSize / (1024 * 1024 * 1024);
        const storagePercentage = Math.min((totalSize / this.storageLimitBytes) * 100, 100);

        const cardsCount = this.cards.length;
        const cardsPercentage = Math.min((cardsCount / this.cardLimit) * 100, 100);

        const qrsCount = 5; // Placeholder
        const qrsPercentage = Math.min((qrsCount / this.qrLimit) * 100, 100);

        return {
            storage: {
                used: storageUsedGB.toFixed(2),
                total: '5',
                percentage: storagePercentage,
                color: '#3b82f6'
            },
            cards: {
                used: cardsCount,
                total: this.cardLimit,
                percentage: cardsPercentage,
                color: '#ec4899'
            },
            qrs: {
                used: qrsCount,
                total: this.qrLimit,
                percentage: qrsPercentage,
                color: '#22c55e'
            }
        };
    }

    get totalStats() {
        const totalDocs = this.documents.length;
        const totalSize = this.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
        const totalSizeMB = totalSize / (1024 * 1024);

        return {
            documents: totalDocs,
            folders: this.folders.length,
            size: `${totalSizeMB.toFixed(1)}MB`
        };
    }

    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
    }

    // --- Chart Helpers ---

    getCircleDashArray(percentage: number, radius: number): string {
        const circumference = 2 * Math.PI * radius;
        const dash = (percentage / 100) * circumference;
        return `${dash} ${circumference}`;
    }

    getCurrentChartValue(): number {
        switch (this.selectedChartStat) {
            case 'storage': return this.dashboardStats.storage.percentage;
            case 'cards': return this.dashboardStats.cards.percentage;
            case 'qrs': return this.dashboardStats.qrs.percentage;
            default: return this.dashboardStats.storage.percentage;
        }
    }

    getCurrentChartLabel(): string {
        switch (this.selectedChartStat) {
            case 'storage': return 'Storage';
            case 'cards': return 'Cards';
            case 'qrs': return 'QRs';
            default: return 'Storage';
        }
    }

    selectChartStat(stat: 'storage' | 'cards' | 'qrs') {
        this.selectedChartStat = stat;
    }

    getSelectedStatDetails() {
        switch (this.selectedChartStat) {
            case 'storage': return { used: this.dashboardStats.storage.used, total: this.dashboardStats.storage.total, unit: 'GB', label: 'Storage' };
            case 'cards': return { used: this.dashboardStats.cards.used, total: this.dashboardStats.cards.total, unit: '', label: 'Cards' };
            case 'qrs': return { used: this.dashboardStats.qrs.used, total: this.dashboardStats.qrs.total, unit: '', label: 'QRs' };
            default: return { used: this.dashboardStats.storage.used, total: this.dashboardStats.storage.total, unit: 'GB', label: 'Storage' };
        }
    }

    // --- Shared Document Logic ---

    hasSharedDocuments(): boolean {
        return this.documents.some(doc => this.isSharedDocument(doc));
    }

    isSharedDocument(doc: Document): boolean {
        if (doc.folderId) {
            const folder = this.folders.find(f => f.id === doc.folderId);
            if (folder && folder.name.toLowerCase() === 'shared') return true;
        }
        // @ts-ignore
        const sharedBy = (doc as any).sharedBy;
        return sharedBy !== undefined && sharedBy !== null && sharedBy !== '';
    }

    getSharedDocumentsCount(): number {
        return this.documents.filter(doc => this.isSharedDocument(doc)).length;
    }

    getDocumentSharer(doc: Document): { name: string; initial: string } {
        const sharers: { [key: string]: { name: string; initial: string } } = {
            'doc1': { name: 'John Doe', initial: 'JD' },
            'doc2': { name: 'Jane Smith', initial: 'JS' },
        };
        return sharers[doc.id] || { name: 'Unknown', initial: 'U' };
    }

    formatFileSize(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';
        const kb = 1024;
        const mb = kb * 1024;
        const gb = mb * 1024;
        if (bytes < kb) return `${bytes} B`;
        else if (bytes < mb) return `${(bytes / kb).toFixed(1)} KB`;
        else if (bytes < gb) return `${(bytes / mb).toFixed(1)} MB`;
        else return `${(bytes / gb).toFixed(2)} GB`;
    }

    getTotalItemsCount(): number {
        return this.currentFolders.length + this.currentDocuments.length;
    }

    // --- Navigation & UI ---

    toggleFabMenu() {
        this.showFabMenu = !this.showFabMenu;
    }

    setViewMode(mode: 'folders' | 'cards' | 'qrs') {
        this.viewMode = mode;
        if (mode === 'folders') {
            this.currentFolderId = null;
        } else if (mode === 'cards') {
            this.currentCardFolder = null;
        }
    }

    openFolder(folderId: string) {
        this.currentFolderId = folderId;
        this.viewMode = 'folders';
        setTimeout(() => {
            if (this.breadcrumbContainer && this.breadcrumbs.length > 3) {
                const container = this.breadcrumbContainer.nativeElement;
                const breadcrumbPath = container.querySelector('.overflow-x-auto');
                if (breadcrumbPath) breadcrumbPath.scrollLeft = breadcrumbPath.scrollWidth;
            }
        }, 100);
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
            if (this.currentFolderId === 'shared-folder') {
                this.currentFolderId = null;
            } else {
                const currentFolder = this.folders.find(f => f.id === this.currentFolderId);
                if (currentFolder && currentFolder.parentId) {
                    this.currentFolderId = currentFolder.parentId;
                } else {
                    this.currentFolderId = null;
                }
            }
        } else {
            this.router.navigate(['/dashboard']);
        }
    }

    onSearch(event: any) {
        const input = event.target as HTMLInputElement;
        const sanitized = this.inputSanitizer.sanitize(input.value);

        // Only update input value if it changed
        if (input.value !== sanitized) {
            input.value = sanitized;
        }
        this.searchQuery = sanitized;

        if (!this.searchQuery) {
            this.showSearchPanel = false;
            this.searchResults = [];
            return;
        }

        const query = this.searchQuery.toLowerCase();

        // Calculate scores and sort
        const results = this.documents
            .map(doc => {
                const name = doc.name.toLowerCase();
                let score = 0;

                if (name === query) score = 100; // Exact match
                else if (name.startsWith(query)) score = 75; // Starts with
                else if (name.includes(query)) score = 50; // Contains
                else score = 0; // No match

                // Bonus for shorter names (higher density of match) if it contains query
                if (score > 0) {
                    score += (query.length / name.length) * 20;
                }

                return { doc, score, path: this.getFolderPath(doc) };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => ({ doc: item.doc, path: item.path }));

        this.searchResults = results;
        this.showSearchPanel = results.length > 0;
    }

    closeSearchPanel() {
        // Small delay to allow click events on items to fire before panel disappears
        setTimeout(() => {
            this.showSearchPanel = false;
        }, 200);
    }

    getFolderPath(doc: Document): string {
        if (!doc.folderId) return 'Home';

        const pathParts: string[] = [];
        let currentId: string | null = doc.folderId;

        while (currentId) {
            const folder = this.folders.find(f => f.id === currentId);
            if (folder) {
                pathParts.unshift(folder.name);
                currentId = folder.parentId;
            } else {
                break;
            }
        }

        if (pathParts.length === 0) return 'Home';
        return 'Home > ' + pathParts.join(' > ');
    }

    // --- Notification & Header ---

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

    openDocument(doc: Document) {
        // Prevent clicking if another document is already loading
        if (this.loadingDocumentId) {
            return;
        }

        // Show spinner for this specific document
        this.loadingDocumentId = doc.id;

        // Fetch document content first
        this.documentService.downloadDocument(doc.id, doc.name).subscribe({
            next: (blob: Blob) => {
                this.loadingDocumentId = null;
                const url = window.URL.createObjectURL(blob);
                // Navigate with preloaded URL in state
                this.router.navigate(['/documents/preview', doc.id], {
                    queryParams: { folderId: this.currentFolderId },
                    state: {
                        preloadedUrl: url,
                        document: doc
                    }
                });
            },
            error: (err) => {
                // Clear loading state on error
                this.loadingDocumentId = null;
                this.cdr.detectChanges();
                console.error('Failed to load document:', err);
                this.toastService.showError('Could not load document');
            }
        });
    }

    // --- Folder Logic ---

    // --- Folder Logic ---

    detectFolderProperties(folderName: string) {
        const props = this.iconMappingService.getFolderProperties(folderName);
        this.detectedIcon = props.icon;
        this.detectedColor = props.color;
    }

    onFolderNameChange(): void {
        if (this.newFolderName.trim()) {
            this.detectFolderProperties(this.newFolderName);
        } else {
            this.detectedIcon = 'folder';
            this.detectedColor = 'bg-blue-50';
        }
    }

    openCreateFolderModal() {
        this.showCreateFolderModal = true;
        this.newFolderName = '';
        this.selectedLocationId = this.currentFolderId;
        this.showLocationDropdown = false;
        this.showFabMenu = false;
        this.detectedIcon = 'folder';
        this.detectedColor = 'bg-blue-50';
    }

    closeCreateFolderModal() {
        this.showCreateFolderModal = false;
        this.newFolderName = '';
        this.selectedLocationId = null;
        this.showLocationDropdown = false;
        this.detectedIcon = 'folder';
        this.detectedColor = 'bg-blue-50';
    }

    toggleLocationDropdown() {
        this.showLocationDropdown = !this.showLocationDropdown;
    }

    selectLocation(locationId: string | null) {
        this.selectedLocationId = locationId;
        this.showLocationDropdown = false;
    }

    getSelectedLocationPath(): string {
        if (this.selectedLocationId === null) return 'My Documents (Root)';
        const folder = this.folders.find(f => f.id === this.selectedLocationId);
        return folder ? folder.name : 'My Documents (Root)';
    }

    createFolder() {
        if (!this.newFolderName.trim()) return;

        const config = this.appConfig.config();
        const currentDepth = this.breadcrumbs.length;

        if (currentDepth >= config.maxFolderNestingAllowed) {
            this.toastService.showError(`Max folder nesting (${config.maxFolderNestingAllowed}) reached.`);
            return;
        }

        const folderName = this.newFolderName.trim();
        const detectedIcon = this.detectedIcon;
        const detectedColor = this.detectedColor;
        const targetFolderId = this.currentFolderId;

        this.closeCreateFolderModal();
        this.toastService.showSuccess('Creating folder...');

        this.documentService.createFolder(
            folderName,
            targetFolderId,
            detectedIcon,
            detectedColor
        ).subscribe({
            next: () => {
                // Real-time update will handle the list
            },
            error: (err) => {
                console.error('Create folder failed', err);
                this.toastService.showError('Failed to create folder');
            }
        });
    }

    // --- Upload Logic ---

    openUploadModal() {
        this.showUploadModal = true;
        this.selectedFile = null;
        this.documentName = '';
        this.showFabMenu = false;
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

        // Validating file before starting upload UI state
        const storageUsed = this.authService.user()?.storageUsed || 0;
        const validationError = this.documentService.validateFile(this.selectedFile, storageUsed);

        if (validationError) {
            this.toastService.showError(validationError);
            return;
        }

        this.isUploading = true;
        this.toastService.showSuccess(`Uploading ${this.selectedFile.name}...`);
        const targetFolderId = this.currentFolderId;

        this.documentService.uploadDocument(this.selectedFile, 'Personal', targetFolderId, this.documentName, this.authService.user()?.storageUsed || 0)
            .subscribe({
                next: () => {
                    this.isUploading = false;
                    this.toastService.showSuccess('Upload complete');
                    this.closeUploadModal();
                    this.cdr.detectChanges(); // Force update
                },
                error: (err) => {
                    this.isUploading = false;
                    console.error('Upload failed', err);
                    const errorMessage = err.message || (err.error && err.error.message) || 'Failed to upload document';
                    this.toastService.showError(errorMessage);
                    this.selectedFile = null;
                    this.documentName = '';
                    this.cdr.detectChanges(); // Force update
                }
            });
    }

    downloadDocument(doc: Document) {
        this.toastService.showSuccess(`Downloading ${doc.name}...`);
        this.documentService.downloadDocument(doc.id, doc.name).subscribe({
            next: (blob: Blob) => {
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = doc.name;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Clean up the URL object after a short delay
                setTimeout(() => window.URL.revokeObjectURL(url), 100);
                this.toastService.showSuccess('Download started');
            },
            error: (err: any) => {
                console.error('Download failed', err);
                this.toastService.showError('Failed to download document');
            }
        });
    }

    shareDocument(doc: Document) {
        this.itemToShare = { id: doc.id, name: doc.name, type: 'document' };
        this.showShareSheet = true;
    }

    deleteDocument(doc: Document) {
        const d = doc as any;
        if (!d.driveFileId) {
            this.toastService.showError('Cannot delete: Missing Drive ID');
            return;
        }

        this.isDeleting = true;
        this.documentService.deleteDocument(d.id, d.driveFileId, d.size || 0).subscribe({
            next: () => {
                this.toastService.showSuccess('Document deleted successfully');
                this.closeDeleteSheet();
            },
            error: () => {
                this.toastService.showError('Failed to delete document');
                this.isDeleting = false;
                this.closeDeleteSheet();
            }
        });
    }

    deleteFolder(folder: Folder) {
        this.isDeleting = true;
        this.documentService.deleteFolder(folder.id).subscribe({
            next: () => {
                this.toastService.showSuccess('Folder deleted successfully');
                this.closeDeleteSheet();
            },
            error: () => {
                this.toastService.showError('Failed to delete folder');
                this.isDeleting = false;
                this.closeDeleteSheet();
            }
        });
    }

    closeDeleteSheet() {
        this.showDeleteSheet = false;
        this.itemToDelete = null;
        this.isDeleting = false;
        this.deleteMessage = '';
    }

    executeDelete() {
        if (!this.itemToDelete) return;

        if (this.itemToDelete.type === 'document') {
            this.deleteDocument(this.itemToDelete.data);
        } else if (this.itemToDelete.type === 'folder') {
            this.deleteFolder(this.itemToDelete.data);
        }
    }

    confirmDeleteFolder(folder: Folder) {
        this.itemToDelete = { type: 'folder', data: folder };
        this.deleteMessage = `Are you sure you want to delete "${folder.name}" and all its contents?`;
        this.showDeleteSheet = true;
    }

    confirmDeleteDocument(doc: Document) {
        this.itemToDelete = { type: 'document', data: doc };
        this.deleteMessage = `Are you sure you want to delete "${doc.name}"?`;
        this.showDeleteSheet = true;
    }

    // --- Icon Helpers ---

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
            'calculator': 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zM12 13.5h.008v.008H12V13.5zm0 2.25h.008v.008H12v-.008zm0 2.25h.008V18H12v-.008zM15.75 13.5h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zM6 7.5h12A1.5 1.5 0 0119.5 9v10.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 016 7.5zM10.5 4.5a.75.75 0 00-.75.75v.75h4.5v-.75a.75.75 0 00-.75-.75h-3z',
            'home': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
            'truck': 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125A1.125 1.125 0 0021 17.625v-3.375m-9-3.75h5.25m0 0V8.25a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v1.5m5.25-1.5a1.5 1.5 0 00-1.5-1.5H9.75a1.5 1.5 0 00-1.5 1.5v1.5M12 9.75v1.5m0-1.5h3.75m-3.75 0H8.25',
            'folder': 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
            'document': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
            'share': 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
            'pdf': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
            'currency-rupee': 'M15 8.25H9m6 3H9m3 6l-3-3h1.5a3 3 0 100-6M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
            'shopping-bag': 'M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
            'musical-note': 'M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z',
            'video-camera': 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z',
            'photo': 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
            'code-bracket': 'M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5',
            'image': 'M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z',
            'cloud': 'M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z',
            'lock-closed': 'M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z',
            'archive-box': 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z',
            'star': 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.563.045.796.77.361 1.135l-4.223 3.535a.562.562 0 00-.182.556l1.285 5.378a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.379a.562.562 0 00-.182-.556l-4.223-3.536a.562.562 0 01.361-1.135l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z',
            'envelope': 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75',
            'calendar': 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
            'globe-alt': 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418',
            'pencil-square': 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10',
            'chart-bar': 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
            'trophy': 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.504-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0',
            'document-text': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
            'device-phone-mobile': 'M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3',
            'controller': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
            'users': 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
            'arrow-down-tray': 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3',
            'beaker': 'M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
        return icons[iconName] || icons['folder'];
    }

    getFolderIconBackground(index: number): string { return 'bg-blue-50'; }
    getFolderIconColor(index: number): string { return 'text-blue-600'; }

    getDocumentIconGradient(doc: Document): string {
        if (doc.icon === 'pdf') return 'bg-red-50';
        if (doc.icon === 'image') return 'bg-emerald-50';
        return 'bg-blue-50';
    }

    getDocumentIconColor(doc: Document): string {
        if (doc.icon === 'pdf') return 'text-red-600';
        if (doc.icon === 'image') return 'text-emerald-600';
        return 'text-blue-600';
    }

    // --- Card Methods ---

    openCardFolder(type: 'debit' | 'credit') {
        this.currentCardFolder = type;
        this.viewMode = 'card-folder';
    }

    getCurrentFolderCards(): Card[] {
        if (!this.currentCardFolder) return [];
        return this.cards.filter(card => card.type === this.currentCardFolder);
    }

    getTotalCardsCount(): number { return this.cards.length; }
    getDebitCardsCount(): number { return this.cards.filter(card => card.type === 'debit').length; }
    getCreditCardsCount(): number { return this.cards.filter(card => card.type === 'credit').length; }

    getCardGradient(type: string): string {
        return type === 'credit'
            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'
            : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800';
    }

    formatCardNumber(number: string): string {
        return number.replace(/(.{4})/g, '$1 ').trim();
    }

    toggleCardCVV(cardId: string): void {
        if (this.showCardCVV.has(cardId)) {
            this.showCardCVV.delete(cardId);
        } else {
            this.showCardCVV.add(cardId);
        }
    }

    copyCardDetails(card: Card): void {
        const details = `Card: ${card.name}\nNumber: ${this.formatCardNumber(card.number)}\nExpiry: ${card.expiryDate}\nCVV: ${card.cvv || 'N/A'}`;
        navigator.clipboard.writeText(details).then(() => {
            this.toastService.showSuccess('Card details copied to clipboard');
        }).catch(() => {
            this.toastService.showError('Failed to copy card details');
        });
    }

    // --- Card Edit/Add Logic ---

    openAddCardBottomSheet() {
        this.editingCard = null;
        this.showAddCardBottomSheet = true;
        this.newCardName = '';
        this.newCardNumber = '';
        this.newCardExpiry = '';
        this.newCardCvv = '';
        this.showFabMenu = false;
    }

    closeAddCardBottomSheet() {
        this.showAddCardBottomSheet = false;
        this.editingCard = null;
        this.newCardName = '';
        this.newCardNumber = '';
        this.newCardExpiry = '';
        this.newCardCvv = '';
    }

    openAddCardModal() { this.openAddCardBottomSheet(); }
    closeAddCardModal() { this.closeAddCardBottomSheet(); }

    editCard(card: Card): void {
        this.editingCard = card;
        this.newCardName = card.name;
        this.newCardNumber = this.formatCardNumber(card.number);
        this.newCardExpiry = card.expiryDate;
        this.newCardCvv = card.cvv || '';
        this.newCardType = card.type === 'credit' ? 'Credit Card' : 'Debit Card';
        this.showAddCardBottomSheet = true;
    }

    formatCardNumberInput(event: any) {
        let value = event.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
        const matches = value.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            event.target.value = parts.join(' ');
            this.newCardNumber = parts.join(' ');
        } else {
            event.target.value = value;
            this.newCardNumber = value;
        }
    }

    formatExpiryDate(event: any) {
        let value = event.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        event.target.value = value;
        this.newCardExpiry = value;
    }

    addCard() {
        if (!this.newCardName.trim() || !this.newCardNumber.trim()) return;

        const config = this.appConfig.config();
        const currentTypeCount = this.cards.filter(c => c.type === this.currentCardFolder).length;
        const limit = this.currentCardFolder === 'credit' ? config.maxCreditCardsLimit : config.maxDebitCardsLimit;

        if (!this.editingCard && currentTypeCount >= limit) {
            this.toastService.showError(`${this.currentCardFolder} card limit reached. Max ${limit} allowed.`);
            return;
        }

        this.toastService.showSuccess(this.editingCard ? 'Updating card...' : 'Adding card...');

        if (this.editingCard) {
            const updates: Partial<Card> = {
                name: this.newCardName.trim(),
                number: this.newCardNumber.trim().replace(/\s/g, ''),
                expiryDate: this.newCardExpiry,
                cvv: this.newCardCvv || ''
            };

            this.cardService.updateCard(this.editingCard.id, updates).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card updated successfully');
                    this.closeAddCardBottomSheet();
                },
                error: (err) => {
                    console.error('Update card failed', err);
                    this.toastService.showError('Failed to update card');
                }
            });
        } else {
            const newCard: Partial<Card> = {
                name: this.newCardName.trim(),
                type: this.currentCardFolder || 'debit',
                number: this.newCardNumber.trim().replace(/\s/g, ''),
                expiryDate: this.newCardExpiry,
                cvv: this.newCardCvv || '',
                holderName: this.firstName // Default to user first name or similar, required by interface
            };

            this.cardService.createCard(newCard).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card added successfully');
                    this.closeAddCardBottomSheet();
                },
                error: (err) => {
                    console.error('Add card failed', err);
                    this.toastService.showError('Failed to add card');
                }
            });
        }
    }

    deleteCard(cardId: string) {
        this.toastService.showSuccess('Deleting card...');
        this.cardService.deleteCard(cardId).subscribe({
            next: () => {
                this.toastService.showSuccess('Card deleted');
            },
            error: (err) => {
                console.error('Delete card failed', err);
                this.toastService.showError('Failed to delete card');
            }
        });
    }

    confirmDeleteCard(card: Card) {
        if (confirm(`Are you sure you want to delete "${card.name}"?`)) {
            this.deleteCard(card.id);
        }
    }

    // --- Menu Logic ---

    toggleDocumentMenu(docId: string) {
        this.activeDocumentMenu = this.activeDocumentMenu === docId ? null : docId;
    }

    closeDocumentMenu() { this.activeDocumentMenu = null; }

    toggleFolderMenu(folderId: string) {
        this.activeFolderMenu = this.activeFolderMenu === folderId ? null : folderId;
        this.activeDocumentMenu = null;
    }

    closeFolderMenu() { this.activeFolderMenu = null; }

    // --- Edit Folder ---

    startEditFolder(folder: Folder) {
        this.editFolderId = folder.id;
        this.editFolderName = folder.name;
        this.closeFolderMenu();
    }

    cancelEditFolder() {
        this.editFolderId = null;
        this.editFolderName = '';
    }

    saveEditFolder(folder: Folder) {
        if (!this.editFolderName.trim() || this.editFolderName.trim() === folder.name) {
            this.cancelEditFolder();
            return;
        }

        const newName = this.editFolderName.trim();
        this.editFolderId = null;
        this.toastService.showSuccess('Folder renamed');

        this.documentService.updateFolder(folder.id, newName).subscribe({
            next: () => { },
            error: () => this.toastService.showError('Failed to rename folder')
        });
    }

    // --- Click Outside ---

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (target.closest('button') && (target.closest('button')?.getAttribute('click-stop-propagation'))) {
            return;
        }
        this.closeDocumentMenu();
        this.closeFolderMenu();
    }

    // --- File Selection for Upload UI (Icon) ---

    getSelectedFileIcon(): string {
        if (!this.selectedFile) return 'document';
        const type = this.selectedFile.type;
        const name = this.selectedFile.name.toLowerCase();

        if (type.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
        if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
        return 'document';
    }

    getSelectedFileIconGradient(): string {
        const icon = this.getSelectedFileIcon();
        if (icon === 'pdf') return 'bg-red-50';
        if (icon === 'image') return 'bg-emerald-50';
        return 'bg-blue-50';
    }

    getSelectedFileIconColor(): string {
        const icon = this.getSelectedFileIcon();
        if (icon === 'pdf') return 'text-red-600';
        if (icon === 'image') return 'text-emerald-600';
        return 'text-blue-600';
    }

    // --- Input Keydown ---

    onInputKeydown(event: KeyboardEvent) {
        const isSelectAll = (event.ctrlKey || event.metaKey) && (event.key === 'a' || event.code === 'KeyA');
        if (isSelectAll) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const target = event.target as HTMLInputElement;
            if (target && typeof target.select === 'function') {
                target.select();
            }
        } else {
            event.stopPropagation();
        }
    }
}