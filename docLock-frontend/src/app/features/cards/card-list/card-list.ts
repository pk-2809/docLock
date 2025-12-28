import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../core/services/toast.service';

interface Card {
    id: string;
    name: string;
    type: 'credit' | 'debit';
    number: string;
    expiryDate: string;
    cvv: string;
    createdAt: Date;
}

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './card-list.html',
    styleUrl: './card-list.css'
})
export class CardListComponent {
    private toastService = inject(ToastService);

    showAddCardModal = false;
    flippedCards = new Set<string>();
    showCVV = new Set<string>();
    editingCard: Card | null = null;

    // Sample cards data
    cards: Card[] = [
        {
            id: '1',
            name: 'Personal Credit',
            type: 'credit',
            number: '4532123456789012',
            expiryDate: '12/26',
            cvv: '123',
            createdAt: new Date()
        },
        {
            id: '2',
            name: 'Business Debit',
            type: 'debit',
            number: '5555666677778888',
            expiryDate: '08/25',
            cvv: '456',
            createdAt: new Date()
        }
    ];

    newCard: Partial<Card> = {
        name: '',
        type: 'credit',
        number: '',
        expiryDate: '',
        cvv: ''
    };

    getCardGradient(type: string): string {
        return type === 'credit' 
            ? 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'
            : 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800';
    }

    formatCardNumber(number: string): string {
        return number.replace(/(.{4})/g, '$1 ').trim();
    }

    toggleCardFlip(cardId: string): void {
        if (this.showCVV.has(cardId)) {
            this.showCVV.delete(cardId);
        } else {
            this.showCVV.add(cardId);
        }
    }

    copyCardDetails(card: Card): void {
        const details = `Card: ${card.name}\nNumber: ${this.formatCardNumber(card.number)}\nExpiry: ${card.expiryDate}\nCVV: ${card.cvv}`;
        navigator.clipboard.writeText(details).then(() => {
            this.toastService.showSuccess('Card details copied to clipboard');
        }).catch(() => {
            this.toastService.showError('Failed to copy card details');
        });
    }

    editCard(card: Card): void {
        this.editingCard = card;
        this.newCard.name = card.name;
        this.newCard.type = card.type;
        this.newCard.number = this.formatCardNumber(card.number);
        this.newCard.expiryDate = card.expiryDate;
        this.newCard.cvv = card.cvv || '';
        this.showAddCardModal = true;
    }

    deleteCard(cardId: string): void {
        this.cards = this.cards.filter(card => card.id !== cardId);
        this.showCVV.delete(cardId);
        this.flippedCards.delete(cardId);
        this.toastService.showSuccess('Card deleted successfully');
    }

    addCard(): void {
        if (this.newCard.name && this.newCard.number && this.newCard.expiryDate && this.newCard.cvv) {
            if (this.editingCard) {
                // Update existing card
                const cardIndex = this.cards.findIndex(c => c.id === this.editingCard!.id);
                if (cardIndex > -1) {
                    this.cards[cardIndex] = {
                        ...this.editingCard,
                        name: this.newCard.name,
                        type: this.newCard.type as 'credit' | 'debit',
                        number: this.newCard.number.replace(/\s/g, ''),
                        expiryDate: this.newCard.expiryDate,
                        cvv: this.newCard.cvv
                    };
                    this.toastService.showSuccess('Card updated successfully');
                }
            } else {
                // Add new card
                const card: Card = {
                    id: Date.now().toString(),
                    name: this.newCard.name,
                    type: this.newCard.type as 'credit' | 'debit',
                    number: this.newCard.number.replace(/\s/g, ''),
                    expiryDate: this.newCard.expiryDate,
                    cvv: this.newCard.cvv,
                    createdAt: new Date()
                };
                this.cards.push(card);
                this.toastService.showSuccess('Card added successfully');
            }

            this.resetNewCard();
            this.showAddCardModal = false;
            this.editingCard = null;
        } else {
            this.toastService.showError('Please fill in all required fields');
        }
    }

    private resetNewCard(): void {
        this.newCard = {
            name: '',
            type: 'credit',
            number: '',
            expiryDate: '',
            cvv: ''
        };
        this.editingCard = null;
    }
}
