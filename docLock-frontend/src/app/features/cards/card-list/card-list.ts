import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Card {
    id: string;
    name: string;
    type: 'credit' | 'debit';
    number: string;
    expiryDate: string;
    cvv: string;
    createdAt: Date;
    holderName?: string;
    bankName?: string;
    color?: string;
}

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './card-list.html',
    styleUrl: './card-list.css'
})
export class CardListComponent implements OnInit {
    router = inject(Router);

    showAddCardModal = false;
    editingCard: Card | null = null;
    
    // Track which cards show CVV (true) or card number (false)
    cardVisibilityState = new Map<string, 'number' | 'cvv'>();

    // Sample cards data
    allCards: Card[] = [
        {
            id: '1',
            name: 'Personal Visa',
            type: 'credit',
            number: '4532123456789012',
            expiryDate: '12/26',
            cvv: '123',
            holderName: 'John Doe',
            createdAt: new Date(),
            color: 'from-blue-600 to-purple-700'
        },
        {
            id: '2',
            name: 'Business Mastercard',
            type: 'credit',
            number: '5555666677778888',
            expiryDate: '08/25',
            cvv: '456',
            holderName: 'Jane Smith',
            createdAt: new Date(),
            color: 'from-purple-600 to-pink-600'
        },
        {
            id: '3',
            name: 'Savings Account',
            type: 'debit',
            number: '4111222233334444',
            expiryDate: '03/27',
            cvv: '789',
            holderName: 'John Doe',
            createdAt: new Date(),
            color: 'from-emerald-600 to-teal-700'
        },
        {
            id: '4',
            name: 'Checking Account',
            type: 'debit',
            number: '4000111122223333',
            expiryDate: '11/28',
            cvv: '321',
            holderName: 'Jane Smith',
            createdAt: new Date(),
            color: 'from-green-600 to-emerald-700'
        }
    ];

    get debitCards(): Card[] {
        return this.allCards.filter(card => card.type === 'debit');
    }

    get creditCards(): Card[] {
        return this.allCards.filter(card => card.type === 'credit');
    }

    newCard: Partial<Card> = {
        name: '',
        type: 'credit',
        number: '',
        expiryDate: '',
        cvv: '',
        holderName: '',
        color: 'from-blue-600 to-purple-700'
    };

    ngOnInit() {
        // Initialize visibility state for all cards to show card number
        this.allCards.forEach(card => {
            this.cardVisibilityState.set(card.id, 'number');
        });
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    openAddCardModal() {
        this.editingCard = null;
        this.resetNewCard();
        this.showAddCardModal = true;
    }

    editCard(card: Card) {
        this.editingCard = card;
        this.newCard = {
            ...card,
            number: this.formatCardNumber(card.number)
        };
        this.showAddCardModal = true;
    }

    deleteCard(cardId: string) {
        if (confirm('Are you sure you want to delete this card?')) {
            this.allCards = this.allCards.filter(card => card.id !== cardId);
            this.cardVisibilityState.delete(cardId);
        }
    }

    addCard() {
        if (this.newCard.name && this.newCard.number && this.newCard.expiryDate && this.newCard.cvv && this.newCard.holderName) {
            const cleanNumber = this.newCard.number.replace(/\s/g, '');

            if (this.editingCard) {
                // Update existing card
                const cardIndex = this.allCards.findIndex(c => c.id === this.editingCard!.id);
                if (cardIndex > -1) {
                    this.allCards[cardIndex] = {
                        ...this.editingCard,
                        ...this.newCard as any,
                        number: cleanNumber
                    };
                }
            } else {
                // Add new card
                const card: Card = {
                    id: Date.now().toString(),
                    name: this.newCard.name!,
                    type: this.newCard.type as 'credit' | 'debit',
                    number: cleanNumber,
                    expiryDate: this.newCard.expiryDate!,
                    cvv: this.newCard.cvv!,
                    holderName: this.newCard.holderName!,
                    createdAt: new Date(),
                    color: this.newCard.color || (this.newCard.type === 'credit' 
                        ? 'from-blue-600 to-purple-700'
                        : 'from-emerald-600 to-teal-700')
                };
                this.allCards.push(card);
                this.cardVisibilityState.set(card.id, 'number');
            }

            this.resetNewCard();
            this.showAddCardModal = false;
            this.editingCard = null;
        }
    }

    private resetNewCard() {
        this.newCard = {
            name: '',
            type: 'credit',
            number: '',
            expiryDate: '',
            cvv: '',
            holderName: '',
            color: 'from-blue-600 to-purple-700'
        };
        this.editingCard = null;
    }

    // Card display methods
    getCardGradient(card: Card): string {
        return card.color ? `bg-gradient-to-br ${card.color}` : 
               (card.type === 'credit' ? 'bg-gradient-to-br from-blue-600 to-purple-700' : 'bg-gradient-to-br from-emerald-600 to-teal-700');
    }

    formatCardNumber(number: string): string {
        if (!number) return '';
        return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    }

    getMaskedCardNumber(number: string): string {
        if (!number) return '';
        const last4 = number.slice(-4);
        return '•••• •••• •••• ' + last4;
    }

    getDisplayCardNumber(card: Card): string {
        const state = this.cardVisibilityState.get(card.id);
        if (state === 'cvv') {
            return this.getMaskedCardNumber(card.number);
        }
        return this.formatCardNumber(card.number);
    }

    getDisplayCVV(card: Card): string {
        const state = this.cardVisibilityState.get(card.id);
        if (state === 'cvv') {
            return card.cvv;
        }
        return '•••';
    }

    toggleCardVisibility(cardId: string) {
        const currentState = this.cardVisibilityState.get(cardId) || 'number';
        this.cardVisibilityState.set(cardId, currentState === 'number' ? 'cvv' : 'number');
    }

    copyToClipboard(text: string, label: string) {
        navigator.clipboard.writeText(text).then(() => {
            // You can add toast notification here if available
            console.log(`${label} copied to clipboard`);
        });
    }

    // Input formatting helpers
    formatInputCardNumber(event: any) {
        let input = event.target.value.replace(/\D/g, '').substring(0, 16);
        input = input != '' ? input.match(/.{1,4}/g)?.join(' ') : '';
        this.newCard.number = input;
    }

    formatInputExpiry(event: any) {
        let input = event.target.value.replace(/\D/g, '').substring(0, 4);
        if (input.length >= 2) {
            input = input.substring(0, 2) + '/' + input.substring(2);
        }
        this.newCard.expiryDate = input;
    }

    // Carousel navigation (for future implementation)
    currentDebitIndex = 0;
    currentCreditIndex = 0;

    nextDebitCard() {
        if (this.debitCards.length > 1) {
            this.currentDebitIndex = (this.currentDebitIndex + 1) % this.debitCards.length;
        }
    }

    prevDebitCard() {
        if (this.debitCards.length > 1) {
            this.currentDebitIndex = this.currentDebitIndex === 0 ? this.debitCards.length - 1 : this.currentDebitIndex - 1;
        }
    }

    nextCreditCard() {
        if (this.creditCards.length > 1) {
            this.currentCreditIndex = (this.currentCreditIndex + 1) % this.creditCards.length;
        }
    }

    prevCreditCard() {
        if (this.creditCards.length > 1) {
            this.currentCreditIndex = this.currentCreditIndex === 0 ? this.creditCards.length - 1 : this.currentCreditIndex - 1;
        }
    }
}

