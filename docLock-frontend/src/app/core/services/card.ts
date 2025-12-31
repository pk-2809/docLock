import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EncryptionService } from './encryption.service';

export interface Card {
    id: string;
    name: string;
    type: 'credit' | 'debit' | string;
    number: string;
    expiryDate: string;
    cvv: string;
    holderName: string;
    bankName?: string;
    color?: string;
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class CardService {
    private http = inject(HttpClient);
    private encryptionService = inject(EncryptionService);
    private apiUrl = `${environment.apiUrl}/api/cards`;

    getCards(): Observable<{ status: string; cards: Card[] }> {
        return this.http.get<{ status: string; cards: Card[] }>(this.apiUrl, { withCredentials: true })
            .pipe(
                map(response => ({
                    ...response,
                    cards: response.cards.map(card => ({
                        ...card,
                        number: this.encryptionService.decrypt(card.number),
                        cvv: this.encryptionService.decrypt(card.cvv)
                    }))
                }))
            );
    }

    createCard(card: Partial<Card>): Observable<{ status: string; card: Card }> {
        const encryptedNumber = this.encryptionService.encrypt(card.number!);
        const encryptedCvv = this.encryptionService.encrypt(card.cvv!);

        const payload = {
            ...card,
            number: encryptedNumber,
            cvv: encryptedCvv,
            numberHmac: this.encryptionService.generateHmac(encryptedNumber),
            cvvHmac: this.encryptionService.generateHmac(encryptedCvv)
        };

        return this.http.post<{ status: string; card: Card }>(this.apiUrl, payload, { withCredentials: true })
            .pipe(
                map(response => ({
                    ...response,
                    card: {
                        ...response.card,
                        number: card.number!, // Return original plain text to UI
                        cvv: card.cvv! // Return original plain text to UI
                    }
                }))
            );
    }

    updateCard(id: string, updates: Partial<Card>): Observable<{ status: string; message: string }> {
        const encryptedUpdates: any = { ...updates };

        if (updates.number) {
            const encryptedNumber = this.encryptionService.encrypt(updates.number);
            encryptedUpdates.number = encryptedNumber;
            encryptedUpdates.numberHmac = this.encryptionService.generateHmac(encryptedNumber);
        }

        if (updates.cvv) {
            const encryptedCvv = this.encryptionService.encrypt(updates.cvv);
            encryptedUpdates.cvv = encryptedCvv;
            encryptedUpdates.cvvHmac = this.encryptionService.generateHmac(encryptedCvv);
        }

        return this.http.put<{ status: string; message: string }>(`${this.apiUrl}/${id}`, encryptedUpdates, { withCredentials: true });
    }

    deleteCard(id: string): Observable<{ status: string; message: string }> {
        return this.http.delete<{ status: string; message: string }>(`${this.apiUrl}/${id}`, { withCredentials: true });
    }
}
