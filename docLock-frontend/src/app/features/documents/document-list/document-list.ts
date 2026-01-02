import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef, AfterViewInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { NotificationService } from '../../../core/services/notification.service';
import { DocumentService, Document, Folder } from '../../../core/services/document';
import { ToastService } from '../../../core/services/toast.service'; // Import ToastService
import { forkJoin, finalize, timeout } from 'rxjs'; // Import forkJoin, finalize, timeout
import { AppConfigService } from '../../../core/services/app-config.service';

interface Card {
    id: string;
    name: string;
    type: 'debit' | 'credit';
    number: string;
    expiryDate: string;
    cvv?: string;
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
export class DocumentListComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('breadcrumbContainer') breadcrumbContainer!: ElementRef;
    private route = inject(ActivatedRoute);
    // Services
    private documentService = inject(DocumentService);
    private toastService = inject(ToastService);
    private appConfig = inject(AppConfigService);
    router = inject(Router);
    authService = inject(AuthService);
    notificationService = inject(NotificationService);
    private configService = inject(AppConfigService); // Added configService injection

    // State
    isFetchingNotifications = false;
    private cdr = inject(ChangeDetectorRef);
    viewMode: 'folders' | 'cards' | 'card-folder' | 'qrs' = 'folders';
    currentFolderId: string | null = null;
    currentCardFolder: 'debit' | 'credit' | null = null;
    searchQuery = '';

    // UI States
    // UI States
    isLoading = true;
    isUploading = false;

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

    // Auto-detected folder properties
    public detectedIcon = 'folder';
    public detectedColor = 'bg-slate-500';

    // Start with empty folders - user creates everything
    folders: Folder[] = [];

    // Start with empty documents - user uploads everything
    documents: Document[] = [];

    // Start with empty cards - user adds everything
    cards: Card[] = [];

    // Dashboard Data
    readonly storageLimitBytes = 5 * 1024 * 1024 * 1024; // 5 GB
    readonly cardLimit = 50;
    readonly qrLimit = 20;

    get dashboardStats() {
        const totalSize = this.documents.reduce((acc, doc) => acc + (doc.size || 0), 0);
        const storageUsedGB = totalSize / (1024 * 1024 * 1024);
        const storagePercentage = Math.min((totalSize / this.storageLimitBytes) * 100, 100);

        const cardsCount = this.cards.length;
        const cardsPercentage = Math.min((cardsCount / this.cardLimit) * 100, 100);

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
                used: cardsCount,
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

    recentActivities = [
        {
            id: 1,
            title: 'Document uploaded',
            description: 'passport_scan.pdf added to Identity folder',
            time: '2 min ago',
            iconBg: 'bg-blue-50',
            iconColor: 'text-blue-600',
            iconPath: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5',
            statusColor: 'bg-green-500'
        },
        {
            id: 2,
            title: 'Card added',
            description: 'New credit card saved securely',
            time: '15 min ago',
            iconBg: 'bg-pink-50',
            iconColor: 'text-pink-600',
            iconPath: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z',
            statusColor: 'bg-blue-500'
        },
        {
            id: 3,
            title: 'File shared',
            description: 'license.jpg shared with John Doe',
            time: '1 hour ago',
            iconBg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            iconPath: 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z',
            statusColor: 'bg-amber-500'
        },
        {
            id: 4,
            title: 'Folder created',
            description: 'New folder "Medical Records" created',
            time: '3 hours ago',
            iconBg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            iconPath: 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
            statusColor: 'bg-slate-400'
        }
    ];

    ngOnInit() {
        this.loadData();

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

        // Global Guard removed to prevent blocking valid interactions.
        // We will handle specific input behavior in the template handlers.
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

    loadData() {
        console.log('Starting loadData...');
        this.isLoading = true;

        forkJoin({
            folders: this.documentService.getFolders(),
            documents: this.documentService.getDocuments()
        }).pipe(
            timeout(10000), // Force timeout after 10 seconds
            finalize(() => {
                console.log('Finalize block executing. Setting isLoading = false');
                this.isLoading = false;
                this.cdr.detectChanges(); // Force UI update
            })
        ).subscribe({
            next: (res) => {
                console.log('Data received:', res);
                try {
                    // Process Folders
                    if (res.folders && res.folders.folders) {
                        this.folders = res.folders.folders.map(f => ({
                            ...f,
                            createdAt: new Date(f.createdAt) as any
                        })) as any;
                    } else {
                        this.folders = [];
                    }

                    // Process Documents
                    if (res.documents && res.documents.documents) {
                        this.documents = res.documents.documents.map(d => ({
                            ...d,
                            type: d.mimeType ? d.mimeType.split('/').pop()?.toUpperCase() : 'DOC',
                            size: d.size || 0,
                            formattedSize: d.size ? `${(d.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB',
                            date: d.createdAt ? new Date(d.createdAt) : new Date(),
                            icon: 'document',
                            color: 'bg-blue-500',
                            folderId: d.folderId || undefined
                        }));
                    } else {
                        this.documents = [];
                    }
                } catch (e) {
                    console.error('Error processing data:', e);
                    this.toastService.showError('Error displaying data');
                }
            },
            error: (err) => {
                console.error('Error loading data', err);
                this.toastService.showError('Failed to load data (Timeout or Error)');
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
            // Handle Shared folder (virtual folder)
            if (this.currentFolderId === 'shared-folder') {
                items.push({
                    id: 'shared-folder',
                    name: 'Shared',
                    path: 'shared-folder'
                });
            } else {
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
        }

        return items;
    }

    get currentFolders(): Folder[] {
        let regularFolders = this.folders.filter(f => f.parentId === this.currentFolderId);

        // Add "Shared" folder at the top only if:
        // 1. We're at root level (currentFolderId === null)
        // 2. There are shared documents
        if (this.currentFolderId === null && this.hasSharedDocuments()) {
            // Filter out any existing "Shared" folder from regular folders to avoid duplicates
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
            // Put Shared folder at the top, then regular folders
            return [sharedFolder, ...regularFolders];
        }

        return regularFolders;
    }

    // Check if there are any shared documents
    hasSharedDocuments(): boolean {
        return this.documents.some(doc => this.isSharedDocument(doc));
    }

    // Check if a document is shared
    isSharedDocument(doc: Document): boolean {
        // Check if document is in a folder named "Shared"
        if (doc.folderId) {
            const folder = this.folders.find(f => f.id === doc.folderId);
            if (folder && folder.name.toLowerCase() === 'shared') {
                return true;
            }
        }
        // Also check if document has sharedBy property (if the backend provides this)
        // @ts-ignore - sharedBy might not be in the interface yet
        const sharedBy = (doc as any).sharedBy;
        return sharedBy !== undefined && sharedBy !== null && sharedBy !== '';
    }

    // Get count of shared documents
    getSharedDocumentsCount(): number {
        return this.documents.filter(doc => this.isSharedDocument(doc)).length;
    }

    // Check if current folder is "Shared"
    get isSharedFolder(): boolean {
        return this.currentFolderId === 'shared-folder' ||
            (this.currentFolderId !== null && this.folders.find(f => f.id === this.currentFolderId)?.name?.toLowerCase() === 'shared');
    }

    // Get sharer name for a document (placeholder - connect to backend later)
    getDocumentSharer(doc: Document): { name: string; initial: string } {
        // TODO: Replace with actual sharedBy data from backend
        // For now, using placeholder data
        const sharers: { [key: string]: { name: string; initial: string } } = {
            'doc1': { name: 'John Doe', initial: 'JD' },
            'doc2': { name: 'Jane Smith', initial: 'JS' },
        };
        return sharers[doc.id] || { name: 'Unknown', initial: 'U' };
    }

    // Format file size properly (KB, MB, GB)
    formatFileSize(bytes: number): string {
        if (!bytes || bytes === 0) return '0 B';

        const kb = 1024;
        const mb = kb * 1024;
        const gb = mb * 1024;

        if (bytes < kb) {
            return `${bytes} B`;
        } else if (bytes < mb) {
            return `${(bytes / kb).toFixed(1)} KB`;
        } else if (bytes < gb) {
            return `${(bytes / mb).toFixed(1)} MB`;
        } else {
            return `${(bytes / gb).toFixed(2)} GB`;
        }
    }

    get totalStats() {
        const totalDocs = this.documents.length;
        const totalSize = this.documents.reduce((acc, doc) => {
            return acc + (doc.size || 0);
        }, 0);

        // Convert to MB
        const totalSizeMB = totalSize / (1024 * 1024);

        return {
            documents: totalDocs,
            folders: this.folders.length,
            size: `${totalSizeMB.toFixed(1)}MB`
        };
    }

    get availableLocations(): Folder[] {
        // Return all folders that can be parent folders (excluding current folder if editing)
        return this.folders.filter(f => f.parentId === null);
    }

    get currentDocuments(): Document[] {
        let filtered: Document[];

        // If we're in the "Shared" folder, show all shared documents
        if (this.currentFolderId === 'shared-folder') {
            filtered = this.documents.filter(doc => this.isSharedDocument(doc));
        } else {
            // Regular folder filtering
            filtered = this.documents.filter(doc => doc.folderId === this.currentFolderId);
        }

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

    setViewMode(mode: 'folders' | 'cards' | 'qrs') {
        this.viewMode = mode;
        if (mode === 'folders') {
            this.currentFolderId = null;
        } else if (mode === 'cards') {
            this.currentCardFolder = null;
        } else if (mode === 'qrs') {
            // QR view logic
        }
    }

    openFolder(folderId: string) {
        this.currentFolderId = folderId;
        this.viewMode = 'folders'; // Stay in folders view, just change current folder

        // Auto-scroll breadcrumb after folder change
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

    navigateToBreadcrumb(item: BreadcrumbItem) {
        if (item.id === 'root') {
            this.setViewMode('folders');
        } else {
            this.openFolder(item.id);
        }
    }

    goBack() {
        if (this.currentFolderId) {
            // Handle Shared folder (virtual folder - always go back to root)
            if (this.currentFolderId === 'shared-folder') {
                this.currentFolderId = null;
            } else {
                // If we're in a subfolder, go back to parent folder or root
                const currentFolder = this.folders.find(f => f.id === this.currentFolderId);
                if (currentFolder && currentFolder.parentId) {
                    this.currentFolderId = currentFolder.parentId;
                } else {
                    this.currentFolderId = null;
                }
            }
        } else {
            // If we're at root level, navigate back to dashboard
            this.router.navigate(['/dashboard']);
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

        const config = this.configService.config();
        // Check nesting limit. Breadcrumbs usually include Root + ancestors + current.
        // If we are IN a folder, breadcrumbs has that folder.
        // If we create a SUB-folder, the depth increases.
        // Approx depth = breadcrumbs.length (Root is 1, subfolder is 2...).
        // User config: maxFolderNestingAllowed (e.g. 5).

        // This is a rough check. If breadcrumbs has 'Root', 'A', 'B' (length 3), creating 'C' makes depth 4.
        const currentDepth = this.breadcrumbs.length;

        if (currentDepth >= config.maxFolderNestingAllowed) {
            this.toastService.showError(`Max folder nesting (${config.maxFolderNestingAllowed}) reached.`);
            return;
        }

        // OPTIMISTIC UPDATE
        // 1. Create a temporary folder object
        const tempId = 'temp-' + Date.now();
        const tempFolder: any = {
            id: tempId,
            name: this.newFolderName.trim(),
            icon: this.detectedIcon,
            color: this.detectedColor,
            parentId: this.selectedLocationId || this.currentFolderId,
            itemCount: 0,
            createdAt: new Date(),
            isOptimistic: true
        };

        // 2. Add to array immediately
        this.folders.push(tempFolder);

        // Update parent folder count recursively
        if (tempFolder.parentId) {
            this.updateFolderCountsRecursively(tempFolder.parentId, 1);
        }

        this.closeCreateFolderModal();
        this.toastService.showSuccess('Folder created!');

        // 3. Perform actual API call
        this.documentService.createFolder(
            tempFolder.name,
            tempFolder.parentId,
            tempFolder.icon,
            tempFolder.color
        ).subscribe({
            next: (res) => {
                // 4. On success, update the temporary object with real ID and data
                Object.assign(tempFolder, {
                    ...res.folder,
                    createdAt: new Date(res.folder.createdAt),
                    isOptimistic: false
                });
            },
            error: (err) => {
                console.error('Create folder failed', err);
                this.toastService.showError('Failed to create folder');
                // 5. On error, remove the optimistic folder
                this.folders = this.folders.filter(f => f.id !== tempId);
                // Revert count
                if (tempFolder.parentId) {
                    this.updateFolderCountsRecursively(tempFolder.parentId, -1);
                }
            }
        });
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

        this.isUploading = true;
        this.toastService.showSuccess(`Uploading ${this.selectedFile.name}...`);

        // Pass currentFolderId (or null) as the target folder
        const targetFolderId = this.currentFolderId;

        this.documentService.uploadDocument(this.selectedFile, 'Personal', targetFolderId, this.documentName)
            .pipe(
                finalize(() => {
                    this.isUploading = false;
                    this.cdr.detectChanges();
                })
            )
            .subscribe({
                next: (res) => {
                    this.toastService.showSuccess('Upload complete');
                    // Add new doc to list
                    const d = res.document;
                    const newDoc = {
                        ...d,
                        type: d.mimeType ? d.mimeType.split('/').pop()?.toUpperCase() : 'DOC',
                        size: d.size || 0,
                        formattedSize: d.size ? `${(d.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB',
                        date: d.createdAt ? new Date(d.createdAt) : new Date(),
                        icon: 'document',
                        color: 'bg-blue-500',
                        folderId: targetFolderId || undefined
                    };

                    this.documents.push(newDoc);

                    // Update folder count recursively
                    if (targetFolderId) {
                        this.updateFolderCountsRecursively(targetFolderId, 1);
                    }

                    this.closeUploadModal();
                },
                error: (err) => {
                    console.error('Upload failed', err);
                    this.toastService.showError('Failed to upload document');
                }
            });
    }

    // Recursively update folder counts in the local state
    updateFolderCountsRecursively(folderId: string, change: number) {
        const folder = this.folders.find(f => f.id === folderId);
        if (folder) {
            folder.itemCount = (folder.itemCount || 0) + change;

            // Recursively update parent
            if (folder.parentId) {
                this.updateFolderCountsRecursively(folder.parentId, change);
            }
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
        const d = doc as any;
        if (!d.driveFileId) {
            this.toastService.showError('Cannot delete: Missing Drive ID');
            return;
        }

        // OPTIMISTIC DELETE
        const docToDelete = doc;
        const index = this.documents.findIndex(i => i.id === doc.id);

        // Remove immediately
        if (index > -1) {
            this.documents.splice(index, 1);
            if (doc.folderId) {
                this.updateFolderCountsRecursively(doc.folderId, -1);
            }
        }
        this.toastService.showSuccess('Document deleted');

        this.documentService.deleteDocument(d.id, d.driveFileId, 0).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                this.toastService.showError('Failed to delete document');
                // Revert
                this.documents.splice(index, 0, docToDelete);
                if (doc.folderId) {
                    this.updateFolderCountsRecursively(doc.folderId, 1);
                }
            }
        });
    }

    deleteFolder(folder: Folder) {
        // OPTIMISTIC DELETE
        const folderToDelete = folder;
        const relatedDocs = this.documents.filter(doc => doc.folderId === folder.id);

        // Remove immediately from UI
        this.folders = this.folders.filter(f => f.id !== folder.id);
        this.documents = this.documents.filter(doc => doc.folderId !== folder.id);

        // Update parent count recursively
        if (folder.parentId) {
            this.updateFolderCountsRecursively(folder.parentId, -1);
        }

        this.toastService.showSuccess('Folder deleted');

        this.documentService.deleteFolder(folder.id).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                this.toastService.showError('Failed to delete folder');
                // Revert
                this.folders.push(folderToDelete);
                this.documents.push(...relatedDocs);
                // Revert count
                if (folder.parentId) {
                    this.updateFolderCountsRecursively(folder.parentId, 1);
                }
            }
        });
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
            'calculator': 'M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zM12 13.5h.008v.008H12V13.5zm0 2.25h.008v.008H12v-.008zm0 2.25h.008V18H12v-.008zM15.75 13.5h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zM6 7.5h12A1.5 1.5 0 0119.5 9v10.5a1.5 1.5 0 01-1.5 1.5H6a1.5 1.5 0 01-1.5-1.5V9A1.5 1.5 0 016 7.5zM10.5 4.5a.75.75 0 00-.75.75v.75h4.5v-.75a.75.75 0 00-.75-.75h-3z',
            'home': 'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
            'truck': 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m15.75 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125A1.125 1.125 0 0021 17.625v-3.375m-9-3.75h5.25m0 0V8.25a2.25 2.25 0 00-2.25-2.25H9a2.25 2.25 0 00-2.25 2.25v1.5m5.25-1.5a1.5 1.5 0 00-1.5-1.5H9.75a1.5 1.5 0 00-1.5 1.5v1.5M12 9.75v1.5m0-1.5h3.75m-3.75 0H8.25',
            'folder': 'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z',
            'document': 'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
            'share': 'M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z'
        };
        return icons[iconName] || icons['folder'];
    }

    // Get gradient classes for folder/document icons (matching friends page style)
    // Get background classes for folder icons (Pastel style)
    getFolderIconBackground(index: number): string {
        const backgrounds = [
            'bg-blue-50',
            'bg-emerald-50',
            'bg-purple-50',
            'bg-amber-50',
            'bg-pink-50',
            'bg-cyan-50',
            'bg-teal-50',
            'bg-indigo-50'
        ];
        return backgrounds[index % backgrounds.length];
    }

    // Get text color classes for folder icons
    getFolderIconColor(index: number): string {
        const colors = [
            'text-blue-600',
            'text-emerald-600',
            'text-purple-600',
            'text-amber-600',
            'text-pink-600',
            'text-cyan-600',
            'text-teal-600',
            'text-indigo-600'
        ];
        return colors[index % colors.length];
    }

    getDocumentIconGradient(index: number): string {
        const backgrounds = [
            'bg-blue-50',
            'bg-emerald-50',
            'bg-purple-50',
            'bg-amber-50',
            'bg-pink-50',
            'bg-cyan-50'
        ];
        return backgrounds[index % backgrounds.length];
    }

    getDocumentIconColor(index: number): string {
        const colors = [
            'text-blue-600',
            'text-emerald-600',
            'text-purple-600',
            'text-amber-600',
            'text-pink-600',
            'text-cyan-600'
        ];
        return colors[index % colors.length];
    }

    // Card Management Methods
    openCardFolder(type: 'debit' | 'credit') {
        this.currentCardFolder = type;
        this.viewMode = 'card-folder';
    }

    getCurrentFolderCards(): Card[] {
        if (!this.currentCardFolder) return [];
        return this.cards.filter(card => card.type === this.currentCardFolder);
    }

    getTotalCardsCount(): number {
        return this.cards.length;
    }

    getDebitCardsCount(): number {
        return this.cards.filter(card => card.type === 'debit').length;
    }

    getCreditCardsCount(): number {
        return this.cards.filter(card => card.type === 'credit').length;
    }

    // Enhanced card display methods
    showCardCVV = new Set<string>();

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

    editCard(card: Card): void {
        this.editingCard = card;
        this.newCardName = card.name;
        this.newCardNumber = this.formatCardNumber(card.number);
        this.newCardExpiry = card.expiryDate;
        this.newCardCvv = card.cvv || '';
        this.newCardType = card.type === 'credit' ? 'Credit Card' : 'Debit Card';
        this.showAddCardBottomSheet = true;
    }

    openAddCardBottomSheet() {
        this.editingCard = null; // Reset editing state
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

    openAddCardModal() {
        this.openAddCardBottomSheet();
    }

    closeAddCardModal() {
        this.closeAddCardBottomSheet();
    }

    addCard() {
        if (!this.newCardName.trim() || !this.newCardNumber.trim()) return;

        const config = this.configService.config();
        const currentTypeCount = this.cards.filter(c => c.type === this.currentCardFolder).length;
        const limit = this.currentCardFolder === 'credit' ? config.maxCreditCardsLimit : config.maxDebitCardsLimit;

        // Only check limit when adding new card (not editing)
        if (!this.editingCard && currentTypeCount >= limit) {
            this.toastService.showError(`${this.currentCardFolder} card limit reached. Max ${limit} allowed.`);
            return;
        }

        if (this.editingCard) {
            // Update existing card
            const cardIndex = this.cards.findIndex(c => c.id === this.editingCard!.id);
            if (cardIndex > -1) {
                this.cards[cardIndex] = {
                    ...this.editingCard,
                    name: this.newCardName.trim(),
                    number: this.newCardNumber.trim().replace(/\s/g, ''),
                    expiryDate: this.newCardExpiry,
                    cvv: this.newCardCvv || undefined
                };
                this.toastService.showSuccess('Card updated successfully');
            }
        } else {
            // Add new card
            const newCard: Card = {
                id: Date.now().toString(),
                name: this.newCardName.trim(),
                type: this.currentCardFolder || 'debit',
                number: this.newCardNumber.trim().replace(/\s/g, ''),
                expiryDate: this.newCardExpiry,
                cvv: this.newCardCvv || undefined,
                createdAt: new Date()
            };
            this.cards.push(newCard);
            this.toastService.showSuccess('Card added successfully');
        }

        this.closeAddCardBottomSheet();
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

    // Stop propagation of key events to prevent global shortcuts (like opening menus)
    // when typing in inputs
    onInputKeydown(event: KeyboardEvent) {
        // Check for Ctrl+A or Cmd+A (Select All)
        const isSelectAll = (event.ctrlKey || event.metaKey) && (event.key === 'a' || event.code === 'KeyA');

        if (isSelectAll) {
            // Prevent the default browser behavior (which might be opening a menu or bubbling)
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            // Manually perform the "Select All" action
            const target = event.target as HTMLInputElement;
            if (target && typeof target.select === 'function') {
                target.select();
            }
        } else {
            // For other keys, just stop propagation to be safe, but allow default typing
            event.stopPropagation();
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

    // Folder Actions Menu Methods
    toggleFolderMenu(folderId: string) {
        this.activeFolderMenu = this.activeFolderMenu === folderId ? null : folderId;
        this.activeDocumentMenu = null; // Close other menus
    }

    closeFolderMenu() {
        this.activeFolderMenu = null;
    }

    // Folder Editing Methods
    startEditFolder(folder: Folder) {
        this.editFolderId = folder.id;
        this.editFolderName = folder.name;
        this.closeFolderMenu();
        // Focus input logic can be handled in template with autofocus or directive, 
        // or a simple specific timeout here if needed, but standard input usually suffices.
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
        const originalName = folder.name;

        // Optimistic Update
        const targetFolder = this.folders.find(f => f.id === folder.id);
        if (targetFolder) {
            targetFolder.name = newName;
            this.detectFolderProperties(newName); // Update icon/color? Maybe keep original? 
            // Re-evaluating icon/color on rename is nice:
            if (targetFolder.icon === 'folder') { // Only update if it was default
                // Actually let's just update perfectly
                // We need to run detection logic but it relies on 'this' state.
                // Let's just update name for now.
            }
        }
        this.editFolderId = null;
        this.toastService.showSuccess('Folder renamed');

        this.documentService.updateFolder(folder.id, newName).subscribe({
            next: () => {
                // Success
            },
            error: (err) => {
                this.toastService.showError('Failed to rename folder');
                if (targetFolder) targetFolder.name = originalName; // Revert
            }
        });
    }

    // Close menus on click outside
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;

        // Check if click is inside a menu or a toggle button
        if (target.closest('button') && (target.closest('button')?.getAttribute('click-stop-propagation'))) {
            return;
        }

        // We use stopPropagation in templates for toggles, so if it reaches here, it's outside.
        // But HostListener catches everything bubbling up.
        // We rely on the fact that existing toggles use $event.stopPropagation().
        // So this triggers only if propagation wasn't stopped.
        // Wait, if I put $event.stopPropagation() on the button, this HostListener (on document) WON'T receive it?
        // NO, document listener receives it in Capture phase or Bubble phase? 
        // Angular HostListener defaults to bubbling. If stopped below, it won't reach here?
        // Correct. So simpler logic: Just close everything here.
        // If a button was clicked and it stopped propagation, this won't fire.

        this.closeDocumentMenu();
        this.closeFolderMenu();
    }

    // Dashboard / Header Logic
    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
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
    openDocument(doc: Document) {
        this.router.navigate(['/documents/preview', doc.id], {
            queryParams: { folderId: this.currentFolderId }
        });
    }


}