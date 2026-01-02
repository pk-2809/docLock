import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth';
import { AppConfigService } from '../services/app-config.service';

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
    private authService = inject(AuthService);
    private configService = inject(AppConfigService);
    private apiUrl = `${environment.apiUrl}/api/documents`;

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

    uploadDocument(file: File, category: string = 'Personal', folderId: string | null = null, name?: string): Observable<any> {
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

        // Check Storage Limit
        const user = this.authService.user();
        const config = this.configService.config();

        if (user && config) {
            const currentUsed = user.storageUsed || 0;
            const newSize = file.size;
            if (currentUsed + newSize > config.maxStorageLimit) {
                return new Observable(observer => {
                    observer.error(new Error(`Storage limit exceeded. Max ${config.maxStorageLimit / (1024 * 1024)}MB allowed.`));
                });
            }

            // Check File Type and Size
            const extension = '.' + file.name.split('.').pop()?.toLowerCase();
            const isImage = config.imgFormatsAllowed?.includes(extension) ?? false;
            const isDoc = config.otherFormatsAllowed?.includes(extension) ?? false;

            if (!isImage && !isDoc) {
                return new Observable(observer => {
                    observer.error(new Error(`Invalid file format. Allowed: ${config.imgFormatsAllowed.join(', ')}, ${config.otherFormatsAllowed.join(', ')}`));
                });
            }

            if (isImage && file.size > config.maxImgSizeAllowed) {
                return new Observable(observer => {
                    observer.error(new Error(`Image size exceeded. Max ${config.maxImgSizeAllowed / (1024 * 1024)}MB allowed.`));
                });
            }

            if (isDoc && file.size > config.maxPdfSizeAllowed) {
                return new Observable(observer => {
                    observer.error(new Error(`Document size exceeded. Max ${config.maxPdfSizeAllowed / (1024 * 1024)}MB allowed.`));
                });
            }
        }

        return this.http.post(`${this.apiUrl}/upload`, formData, { withCredentials: true });
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
}
