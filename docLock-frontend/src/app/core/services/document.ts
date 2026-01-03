import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

import { AppConfigService } from '../services/app-config.service';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../auth/firebase';
import { signal } from '@angular/core';

export interface Document {
    id: string;
    name: string;
    mimeType: string;
    size: number; // in bytes
    driveFileId: string;
    webViewLink: string;
    webContentLink?: string;
    category?: string;
    folderId?: string;
    createdAt?: string;
    // UI states
    isDeleting?: boolean;
    // UI Helpers (Mapped)
    icon?: string;
    color?: string;
    type?: string;
    date?: Date;
    formattedSize?: string;
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    icon: string;
    color: string;
    itemCount: number;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    private http = inject(HttpClient);

    private configService = inject(AppConfigService);
    private apiUrl = `${environment.apiUrl}/api/documents`;

    // Real-time signals
    documents = signal<Document[]>([]);
    folders = signal<Folder[]>([]);
    isLoading = signal<boolean>(false);

    private unsubscribeDocs: (() => void) | null = null;
    private unsubscribeFolders: (() => void) | null = null;

    subscribeToDocuments(uid: string) {
        if (this.unsubscribeDocs) this.unsubscribeDocs();

        const docsRef = collection(db, 'users', uid, 'documents');
        // Optional: Add orderBy if needed, e.g., orderBy('createdAt', 'desc')
        // const q = query(docsRef, orderBy('createdAt', 'desc'));

        this.unsubscribeDocs = onSnapshot(docsRef, (snapshot) => {
            const docsList = snapshot.docs.map(doc => {
                const data = doc.data();
                return this.enrichDocument({
                    id: doc.id,
                    ...data,
                    // Convert timestamp to Date object if needed for the UI
                    createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt'] || Date.now())
                } as Document);
            });
            this.documents.set(docsList);
            console.log(`[DocumentService] Real-time docs updated: ${docsList.length}`);
        }, error => {
            console.error('[DocumentService] Real-time docs error:', error);
        });
    }

    subscribeToFolders(uid: string) {
        if (this.unsubscribeFolders) this.unsubscribeFolders();

        const foldersRef = collection(db, 'users', uid, 'folders');

        this.unsubscribeFolders = onSnapshot(foldersRef, (snapshot) => {
            const foldersList = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt'] || Date.now())
                } as Folder;
            });
            this.folders.set(foldersList);
            console.log(`[DocumentService] Real-time folders updated: ${foldersList.length}`);
        }, error => {
            console.error('[DocumentService] Real-time folders error:', error);
        });
    }

    cleanup() {
        if (this.unsubscribeDocs) {
            this.unsubscribeDocs();
            this.unsubscribeDocs = null;
        }
        if (this.unsubscribeFolders) {
            this.unsubscribeFolders();
            this.unsubscribeFolders = null;
        }
    }

    // Cache State
    private documentsCache: { data: { status: string; documents: Document[] }; timestamp: number } | null = null;
    private readonly CACHE_DURATION = 30000; // 30 seconds

    getDocuments(): Observable<{ status: string; documents: Document[] }> {
        // Return cached data if valid
        if (this.documentsCache && (Date.now() - this.documentsCache.timestamp < this.CACHE_DURATION)) {
            return new Observable(observer => {
                observer.next(this.documentsCache!.data);
                observer.complete();
            });
        }

        // Fetch new data
        return new Observable(observer => {
            this.http.get<{ status: string; documents: Document[] }>(`${this.apiUrl}/list`, { withCredentials: true })
                .subscribe({
                    next: (res) => {
                        // Update cache
                        this.documentsCache = {
                            data: res,
                            timestamp: Date.now()
                        };
                        observer.next(res);
                        observer.complete();
                    },
                    error: (err) => observer.error(err)
                });
        });
    }

    clearCache() {
        this.documentsCache = null;
    }

    getDocument(id: string): Observable<{ status: string; document: Document }> {
        return this.http.get<{ status: string; document: Document }>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    uploadDocument(file: File, category: string = 'Personal', folderId: string | null = null, name?: string, storageUsed: number = 0): Observable<any> {
        this.clearCache();
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        if (folderId) {
            formData.append('folderId', folderId);
        }
        if (name) {
            formData.append('name', name);
        }

        const validationError = this.validateFile(file, storageUsed);
        if (validationError) {
            return new Observable(observer => {
                setTimeout(() => {
                    observer.error(new Error(validationError));
                }, 0);
            });
        }

        return this.http.post(`${this.apiUrl}/upload`, formData, { withCredentials: true });
    }

    validateFile(file: File, storageUsed: number): string | null {
        const config = this.configService.config();
        if (!config) return null;

        // 1. Check File Type and Size
        const parts = file.name.split('.');
        const ext = parts.length > 1 ? '.' + parts.pop()?.toLowerCase() : '';

        const isImage = config.imgFormatsAllowed?.includes(ext) ?? false;
        const isDoc = config.otherFormatsAllowed?.includes(ext) ?? false;

        if (!isImage && !isDoc) {
            return `Invalid file format. Allowed: ${config.imgFormatsAllowed.join(', ')}, ${config.otherFormatsAllowed.join(', ')}`;
        }

        // 2. Check specific size limits
        if (isImage && file.size > config.maxImgSizeAllowed) {
            return `Image size exceeded. Max ${config.maxImgSizeAllowed / (1024 * 1024)}MB allowed.`;
        }

        if (isDoc && file.size > config.maxPdfSizeAllowed) {
            return `Document size exceeded. Max ${config.maxPdfSizeAllowed / (1024 * 1024)}MB allowed.`;
        }

        // 3. Check Storage Limit
        const currentUsed = storageUsed;
        const newSize = file.size;
        if (currentUsed + newSize > config.maxStorageLimit) {
            return `Storage limit exceeded. Max ${config.maxStorageLimit / (1024 * 1024)}MB allowed.`;
        }

        return null;
    }

    downloadDocument(id: string, name: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/download`, {
            withCredentials: true,
            responseType: 'blob'
        });
    }

    deleteDocument(id: string, driveFileId: string, size: number): Observable<any> {
        this.clearCache();
        // Send body with delete request to pass driveId and size optimization
        return this.http.delete(`${this.apiUrl}/${id}`, {
            withCredentials: true,
            body: { driveFileId, size }
        });
    }

    createFolder(name: string, parentId: string | null, icon: string, color: string): Observable<{ status: string; folder: Folder }> {
        this.clearCache();
        return this.http.post<{ status: string; folder: Folder }>(`${this.apiUrl}/folder`, {
            name, parentId, icon, color
        }, { withCredentials: true });
    }

    getFolders(): Observable<{ status: string; folders: Folder[] }> {
        return this.http.get<{ status: string; folders: Folder[] }>(`${this.apiUrl}/folders`, { withCredentials: true });
    }

    deleteFolder(id: string): Observable<any> {
        this.clearCache();
        return this.http.delete(`${this.apiUrl}/folder/${id}`, { withCredentials: true });
    }

    updateFolder(id: string, name: string): Observable<any> {
        this.clearCache();
        return this.http.put(`${this.apiUrl}/folder/${id}`, { name }, { withCredentials: true });
    }

    private enrichDocument(doc: Document): Document {
        const mimeType = doc.mimeType || '';
        const name = doc.name || '';
        const size = doc.size || 0;

        let icon = 'document';
        if (mimeType.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
            icon = 'pdf';
        } else if (mimeType.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            icon = 'image';
        }

        const type = mimeType ? (mimeType.split('/').pop()?.toUpperCase() || 'DOC') : 'DOC';

        const kb = 1024;
        const mb = kb * 1024;
        const gb = mb * 1024;
        let formattedSize = '0 B';
        if (size < kb) formattedSize = `${size} B`;
        else if (size < mb) formattedSize = `${(size / kb).toFixed(1)} KB`;
        else if (size < gb) formattedSize = `${(size / mb).toFixed(1)} MB`;
        else formattedSize = `${(size / gb).toFixed(2)} GB`;

        return {
            ...doc,
            icon,
            type,
            formattedSize,
            color: 'bg-blue-500', // Default color, UI might override/derive gradient
            date: doc.createdAt ? new Date(doc.createdAt) : new Date()
        };
    }
}
