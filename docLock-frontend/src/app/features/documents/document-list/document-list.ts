import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BottomSheetComponent } from '../../../shared/components/bottom-sheet/bottom-sheet.component';
import { DropdownComponent, DropdownOption } from '../../../shared/components/dropdown/dropdown.component';

interface Document {
    id: string;
    name: string;
    type?: string;
    size?: string;
    date: Date;
    icon: string;
    color: string;
    category?: string;
    isFolder?: boolean;
    parentId?: string | null;
}

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule, BottomSheetComponent, DropdownComponent],
    templateUrl: './document-list.html',
    styleUrl: './document-list.css'
})
export class DocumentListComponent implements OnInit {
    viewMode: 'home' | 'grid' | 'list' = 'home';
    searchQuery = '';
    selectedCategory = 'all';

    // File Manager State
    currentFolderId: string | null = null;
    breadcrumbs: { id: string | null; name: string }[] = [{ id: null, name: 'My Documents' }];

    categories = [
        { id: 'all', name: 'All Documents', icon: '📁', count: 12 },
        { id: 'passport', name: 'Passport', icon: '🛂', count: 2 },
        { id: 'license', name: 'License', icon: '🪪', count: 3 },
        { id: 'insurance', name: 'Insurance', icon: '🏥', count: 4 },
        { id: 'other', name: 'Other', icon: '📄', count: 3 }
    ];

    usageStats = {
        qrUsed: 3,
        qrLimit: 5,
        cardsUsed: 4,
        cardsLimit: 5,
        storageUsed: 150, // MB
        storageLimit: 200 // MB
    };

    get storagePercentage(): number {
        return (this.usageStats.storageUsed / this.usageStats.storageLimit) * 100;
    }

    documents: Document[] = [
        {
            id: 'f1',
            name: 'Work Projects',
            date: new Date('2024-12-20'),
            icon: '📁',
            color: 'bg-indigo-100 text-indigo-600',
            isFolder: true,
            parentId: null
        },
        {
            id: 'f2',
            name: 'Personal Stuff',
            date: new Date('2024-12-21'),
            icon: '📁',
            color: 'bg-rose-100 text-rose-600',
            isFolder: true,
            parentId: null
        },
        {
            id: '1',
            name: 'Passport.pdf',
            type: 'PDF',
            size: '2.4 MB',
            date: new Date('2024-12-15'),
            icon: '🛂',
            color: 'from-blue-500 to-cyan-500',
            category: 'passport',
            parentId: null
        },
        {
            id: '2',
            name: 'Driver License.jpg',
            type: 'JPG',
            size: '1.8 MB',
            date: new Date('2024-12-14'),
            icon: '🪪',
            color: 'from-green-500 to-teal-500',
            category: 'license',
            parentId: null
        },
        {
            id: '101',
            name: 'Project Specs.docx',
            type: 'DOCX',
            size: '1.2 MB',
            date: new Date('2024-12-22'),
            icon: '📄',
            color: 'from-blue-500 to-cyan-500',
            category: 'work',
            parentId: 'f1'
        }
    ];

    ngOnInit() {
        // Initialize component
    }

    get filteredDocuments(): Document[] {
        // 1. Filter by Current Folder (Parent ID)
        let filtered = this.documents.filter(doc => {
            // Treat undefined parentId as null (root) for backward compatibility if needed, 
            // but we explicitly set it now.
            return doc.parentId === this.currentFolderId;
        });

        // 2. Filter by Category (if selected and not 'all')
        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(doc => doc.category === this.selectedCategory);
        }

        // 3. Filter by Search Query
        if (this.searchQuery) {
            filtered = filtered.filter(doc =>
                doc.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }

        return filtered;
    }

    setViewMode(mode: 'home' | 'grid' | 'list') {
        this.viewMode = mode;
        // Reset navigation when entering grid/list from home? 
        // Or keep state? Let's reset to root if coming from home to ensure cleaner start.
        if (mode === 'grid' || mode === 'list') {
            // Optional: this.resetNavigation(); 
            // Implementing "reset" logic manually if needed:
            // this.currentFolderId = null;
            // this.breadcrumbs = [{ id: null, name: 'My Documents' }];
        }
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

    // --- File Manager Navigation ---

    openFolder(doc: Document) {
        if (doc.isFolder) {
            this.currentFolderId = doc.id;
            this.breadcrumbs.push({ id: doc.id, name: doc.name });
            this.searchQuery = ''; // Clear search to show folder contents
        }
    }

    navigateUp() {
        if (this.breadcrumbs.length > 1) {
            this.breadcrumbs.pop();
            this.currentFolderId = this.breadcrumbs[this.breadcrumbs.length - 1].id;
        } else {
            // If at root, go back to Home Dashboard
            this.setViewMode('home');
        }
    }

    navigateToBreadcrumb(index: number) {
        this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
        this.currentFolderId = this.breadcrumbs[index].id;
    }

    // --- Actions ---

    // --- Smart Icon Configuration ---
    readonly ICON_CONFIG = [
        { icon: '💰', keywords: ['finance', 'money', 'tax', 'bank', 'bill'] },
        { icon: '🏠', keywords: ['home', 'house', 'family', 'rent', 'lease'] },
        { icon: '💼', keywords: ['work', 'job', 'office', 'project', 'client'] },
        { icon: '📸', keywords: ['photo', 'pic', 'image', 'picture', 'shot'] },
        { icon: '📄', keywords: ['doc', 'file', 'note', 'contract', 'agreement'] },
        { icon: '✈️', keywords: ['travel', 'trip', 'flight', 'ticket', 'visa'] },
        { icon: '🚗', keywords: ['car', 'vehicle', 'insurance', 'license'] },
        { icon: '🏥', keywords: ['health', 'med', 'doctor', 'prescription'] },
        { icon: '🎓', keywords: ['school', 'edu', 'course', 'study'] }
    ];

    // --- State ---
    showFolderSheet = false;
    showDocumentSheet = false;

    newFolderName = '';
    previewIcon = '📁';

    newDocName = '';
    selectedParentId: string | null = null;
    selectedFile: File | null = null;

    // --- Getters ---
    get allFolders(): { id: string | null, name: string }[] {
        const folders = this.documents
            .filter(d => d.isFolder)
            .map(f => ({ id: f.id, name: f.name }));
        return [{ id: null, name: 'My Documents (Root)' }, ...folders];
    }

    get folderOptions(): DropdownOption[] {
        return this.allFolders.map(f => ({ label: f.name, value: f.id }));
    }

    // --- Folder Sheet Methods ---
    createFolder() {
        this.openFolderSheet();
    }

    openFolderSheet() {
        this.showFolderSheet = true;
        this.newFolderName = '';
        this.previewIcon = '📁';
        this.selectedParentId = this.currentFolderId;
    }

    closeFolderSheet() {
        this.showFolderSheet = false;
    }

    onFolderInput(event: any) {
        this.newFolderName = event.target.value;
        this.updatePreviewIcon();
    }

    updatePreviewIcon() {
        const name = this.newFolderName.toLowerCase();
        const match = this.ICON_CONFIG.find(config =>
            config.keywords.some(k => name.includes(k))
        );
        this.previewIcon = match ? match.icon : '📁';
    }

    saveFolder() {
        if (!this.newFolderName) return;

        const newFolder: Document = {
            id: Date.now().toString(),
            name: this.newFolderName,
            date: new Date(),
            icon: this.previewIcon,
            color: 'bg-amber-100 text-amber-600',
            isFolder: true,
            parentId: this.selectedParentId
        };
        this.documents.push(newFolder);
        this.closeFolderSheet();
    }

    // --- Document Sheet Methods ---
    addDocument() {
        this.openDocumentSheet();
    }

    openDocumentSheet() {
        this.newDocName = '';
        this.selectedParentId = this.currentFolderId || (this.allFolders.length === 1 ? 'root' : this.allFolders[0].id);
        this.selectedFile = null; // Reset file
        this.showDocumentSheet = true;
    }

    closeDocumentSheet() {
        this.showDocumentSheet = false;
        this.selectedFile = null;
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.selectedFile = file;
            // Always auto-fill name from file
            const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
            this.newDocName = nameWithoutExt;
        }
    }

    saveDocument() {
        if (!this.selectedFile) {
            // In a real app we might require a file, or allow scanning.
            // For now, let's require it if we are "uploading".
            // But if the user just wants to create a placeholder, maybe allow it?
            // Let's assume for this "Upload" UI that a file is preferred but we fallback to mock.
        }

        const newDoc: Document = {
            id: Math.random().toString(36).substr(2, 9),
            name: this.newDocName || (this.selectedFile ? this.selectedFile.name : 'New Document'),
            type: this.selectedFile ? this.selectedFile.type : 'application/pdf',
            size: this.selectedFile ? (this.selectedFile.size / 1024 / 1024).toFixed(2) + ' MB' : '0 MB',
            date: new Date(),
            icon: '📄', // Simple icon for now
            color: 'bg-slate-100',
            parentId: this.selectedParentId === 'root' ? null : this.selectedParentId
        };

        this.documents.push(newDoc);
        this.closeDocumentSheet();
    }

    downloadDocument(doc: Document) {
        console.log('Downloading:', doc.name);
    }

    shareDocument(doc: Document) {
        console.log('Sharing:', doc.name);
    }

    deleteDocument(doc: Document) {
        console.log('Deleting:', doc.name);
        this.documents = this.documents.filter(d => d.id !== doc.id);
    }
}
