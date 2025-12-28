import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Card {
    id: string;
    name: string;
    type: string;
    number: string;
    expiryDate: string;
    createdAt: Date;
    // Add other fields as needed
}

@Injectable({
    providedIn: 'root'
})
export class CardService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/documents`; // Using document routes for now as I added it there

    getCards(): Observable<{ status: string; cards: Card[] }> {
        return this.http.get<{ status: string; cards: Card[] }>(`${this.apiUrl}/cards`, { withCredentials: true });
    }
}
