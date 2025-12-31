import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardCarouselComponent } from '../card-carousel/card-carousel';
import { Card, CardService } from '../../../core/services/card';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, FormsModule, CardCarouselComponent],
    templateUrl: './card-list.html',
    styleUrl: './card-list.css'
})
export class CardListComponent implements OnInit {
    router = inject(Router);
    toastService = inject(ToastService);
    cardService = inject(CardService);
    cdr = inject(ChangeDetectorRef);

    showAddCardModal = false;
    editingCard: Card | null = null;

    // Track which cards show CVV (true) or card number (false)
    cardVisibilityState = new Map<string, 'number' | 'cvv'>();

    // Sample cards data
    allCards: Card[] = [];

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

    selectedBrand: 'visa' | 'mastercard' | 'rupay' = 'visa';

    // Standard app colors for random theming
    private standardColors = [
        'from-blue-600 to-purple-700',
        'from-emerald-600 to-teal-700',
        'from-purple-600 to-pink-600',
        'from-pink-600 to-rose-600',
        'from-indigo-600 to-blue-700',
        'from-cyan-600 to-blue-600'
    ];

    getRandomColor(): string {
        return this.standardColors[Math.floor(Math.random() * this.standardColors.length)];
    }

    ngOnInit() {
        // Load cards from API
        this.loadCards();
    }

    private loadCards() {
        this.cardService.getCards().subscribe({
            next: (response) => {
                this.allCards = response.cards.map(card => ({
                    ...card,
                    createdAt: new Date(card.createdAt) // Ensure date object
                }));
                // Initialize visibility state
                this.allCards.forEach(card => {
                    this.cardVisibilityState.set(card.id, 'number');
                });
                // Manually trigger change detection to update the view
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load cards:', err);
                this.toastService.showError('Failed to load cards');
            }
        });
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    openAddCardModal() {
        this.router.navigate(['/cards/add']);
    }

    editCard(card: Card) {
        this.router.navigate(['/cards/add'], { queryParams: { id: card.id } });
    }

    getBrandName(brand: 'visa' | 'mastercard' | 'rupay'): string {
        const brandMap = {
            'visa': 'VISA',
            'mastercard': 'MASTERCARD',
            'rupay': 'RUPAY'
        };
        return brandMap[brand];
    }

    deleteCard(cardId: string) {
        if (confirm('Are you sure you want to delete this card?')) {
            this.cardService.deleteCard(cardId).subscribe({
                next: () => {
                    this.allCards = this.allCards.filter(card => card.id !== cardId);
                    this.cardVisibilityState.delete(cardId);
                    this.toastService.showSuccess('Card deleted successfully');
                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Failed to delete card:', err);
                    this.toastService.showError('Failed to delete card');
                }
            });
        }
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
        const cleaned = number.replace(/\s/g, '');
        if (cleaned.length < 8) return number;
        const first4 = cleaned.slice(0, 4);
        const last4 = cleaned.slice(-4);
        return first4 + ' •••• •••• ' + last4;
    }

    getDisplayCardNumber(card: Card): string {
        // Always show masked card number (first 4 and last 4 digits)
        return this.getMaskedCardNumber(card.number);
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
        this.toastService.showSuccess(`${label} copied to clipboard`);
    }

    // Input formatting helpers (keeping these if they are used by template, though template seems to rely on AddCardComponent for adding)
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

}
