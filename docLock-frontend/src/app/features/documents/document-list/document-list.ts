import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Document {
    id: string;
    name: string;
    type: string;
    size: string;
    date: Date;
    icon: string;
    color: string;
    category: string;
}

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './document-list.html',
    styleUrl: './document-list.css'
})
export class DocumentListComponent implements OnInit {
    viewMode: 'home' | 'grid' | 'list' = 'home';
    searchQuery = '';
    selectedCategory = 'all';

    categories = [
        { id: 'all', name: 'All Documents', icon: '📁', count: 12 },
        { id: 'passport', name: 'Passport', icon: '🛂', count: 2 },
        { id: 'license', name: 'License', icon: '🪪', count: 3 },
        { id: 'insurance', name: 'Insurance', icon: '🏥', count: 4 },
        { id: 'other', name: 'Other', icon: '📄', count: 3 }
    ];

    documents: Document[] = [
        {
            id: '1',
            name: 'Passport.pdf',
            type: 'PDF',
            size: '2.4 MB',
            date: new Date('2024-12-15'),
            icon: '🛂',
            color: 'from-blue-500 to-cyan-500',
            category: 'passport'
        },
        {
            id: '2',
            name: 'Driver License.jpg',
            type: 'JPG',
            size: '1.8 MB',
            date: new Date('2024-12-14'),
            icon: '🪪',
            color: 'from-green-500 to-teal-500',
            category: 'license'
        },
        {
            id: '3',
            name: 'Health Insurance.pdf',
            type: 'PDF',
            size: '3.2 MB',
            date: new Date('2024-12-13'),
            icon: '🏥',
            color: 'from-purple-500 to-pink-500',
            category: 'insurance'
        },
        {
            id: '4',
            name: 'Birth Certificate.pdf',
            type: 'PDF',
            size: '1.5 MB',
            date: new Date('2024-12-12'),
            icon: '📄',
            color: 'from-orange-500 to-red-500',
            category: 'other'
        },
        {
            id: '5',
            name: 'Visa Document.pdf',
            type: 'PDF',
            size: '2.1 MB',
            date: new Date('2024-12-11'),
            icon: '✈️',
            color: 'from-indigo-500 to-blue-500',
            category: 'passport'
        },
        {
            id: '6',
            name: 'Car Insurance.pdf',
            type: 'PDF',
            size: '2.8 MB',
            date: new Date('2024-12-10'),
            icon: '🚗',
            color: 'from-pink-500 to-rose-500',
            category: 'insurance'
        }
    ];

    ngOnInit() {
        // Initialize component
    }

    get filteredDocuments(): Document[] {
        let filtered = this.documents;

        if (this.selectedCategory !== 'all') {
            filtered = filtered.filter(doc => doc.category === this.selectedCategory);
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

    downloadDocument(doc: Document) {
        console.log('Downloading:', doc.name);
        // TODO: Implement download logic
    }

    shareDocument(doc: Document) {
        console.log('Sharing:', doc.name);
        // TODO: Implement share logic
    }

    deleteDocument(doc: Document) {
        console.log('Deleting:', doc.name);
        // TODO: Implement delete logic
    }
}
