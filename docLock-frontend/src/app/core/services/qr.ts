import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppSettingsService } from '../services/app-settings.service';

export interface QRCode {
    id: string;
    name: string;
    mpin?: string;
    linkedDocumentIds: string[];
    scanCount: number;
    createdAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class QrService {
    private http = inject(HttpClient);
    private appSettings = inject(AppSettingsService);
    private apiUrl = this.appSettings.apiUrl + '/qrs';

    // Protected Methods
    createQR(data: { name: string, mpin: string, linkedDocumentIds: string[] }): Observable<{ status: string, qr: QRCode }> {
        return this.http.post<{ status: string, qr: QRCode }>(this.apiUrl, data, { withCredentials: true });
    }

    updateQR(id: string, data: { name?: string, linkedDocumentIds?: string[] }): Observable<{ status: string, qr: QRCode }> {
        return this.http.put<{ status: string, qr: QRCode }>(`${this.apiUrl}/${id}`, data, { withCredentials: true });
    }

    getQRs(): Observable<{ status: string, qrs: QRCode[] }> {
        return this.http.get<{ status: string, qrs: QRCode[] }>(this.apiUrl, { withCredentials: true });
    }

    deleteQR(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`, { withCredentials: true });
    }

    // Public Methods
    verifyMpin(qrId: string, mpin: string): Observable<{ status: string, token: string }> {
        return this.http.post<{ status: string, token: string }>(`${this.apiUrl}/public/verify`, { qrId, mpin });
    }

    getPublicDocuments(token: string): Observable<{ status: string, documents: any[] }> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<{ status: string, documents: any[] }>(`${this.apiUrl}/public/documents`, { headers });
    }

    getPublicDocumentContent(token: string, docId: string): Observable<{ status: string, document: any }> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<{ status: string, document: any }>(`${this.apiUrl}/public/documents/${docId}/content`, { headers });
    }

    // Returns Signed URL (Cloud Storage) directly
    getPublicDocumentUrl(token: string, docId: string): Observable<{ status: string, downloadUrl: string }> {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
        return this.http.get<{ status: string, downloadUrl: string }>(`${this.apiUrl}/public/documents/${docId}/proxy`, {
            headers
        });
    }
}
