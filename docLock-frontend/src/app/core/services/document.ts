import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
}

@Injectable({
    providedIn: 'root'
})
export class DocumentService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/documents`;

    getDocuments(): Observable<{ status: string; documents: Document[] }> {
        return this.http.get<{ status: string; documents: Document[] }>(`${this.apiUrl}/list`, { withCredentials: true });
    }

    uploadDocument(file: File, category: string = 'Personal'): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);

        return this.http.post(`${this.apiUrl}/upload`, formData, { withCredentials: true });
    }

    downloadDocument(id: string, name: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${id}/download`, {
            withCredentials: true,
            responseType: 'blob'
        });
    }

    deleteDocument(id: string, driveFileId: string, size: number): Observable<any> {
        // Send body with delete request to pass driveId and size optimization
        return this.http.delete(`${this.apiUrl}/${id}`, {
            withCredentials: true,
            body: { driveFileId, size }
        });
    }
}
