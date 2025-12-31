import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CardCarouselComponent } from '../card-carousel/card-carousel';
import { Card, CardService } from '../../../core/services/card';
import { ToastService } from '../../../core/services/toast.service';

import { ConfirmationSheetComponent } from '../../../shared/components/confirmation-sheet/confirmation-sheet';

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, FormsModule, CardCarouselComponent, ConfirmationSheetComponent],
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
    isLoading = true; // Add loading state

    // Delete Confirmation State
    showDeleteSheet = false;
    cardToDelete: Card | null = null;
    isDeleting = false;

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

    // Standard app colors for random theming (hex colors)
    private standardColors = [
        '#FF5555',
        '#1581BF',
        '#FF6D1F',
        '#5459AC',
        '#007E6E',
        '#8CA9FF',
        '#84994F',
        '#9E1C60',
        '#9B5DE0',
        '#34656D',
        '#D92C54',
        '#DC3C22'
    ];

    getRandomColor(): string {
        return this.standardColors[Math.floor(Math.random() * this.standardColors.length)];
    }

    ngOnInit() {
        // Load cards from API
        this.loadCards();
    }

    private loadCards() {
        this.isLoading = true;
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
                this.isLoading = false;
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Failed to load cards:', err);
                this.toastService.showError('Failed to load cards');
                this.isLoading = false;
            }
        });
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    deleteCard(card: Card) {
        this.cardToDelete = card;
        this.showDeleteSheet = true;
    }

    confirmDeleteCard() {
        if (!this.cardToDelete) return;

        this.isDeleting = true;
        this.cardService.deleteCard(this.cardToDelete.id).subscribe({
            next: () => {
                this.toastService.showSuccess('Card deleted successfully');
                this.loadCards(); // Refresh list
                this.closeDeleteSheet();
            },
            error: (err) => {
                console.error('Failed to delete card:', err);
                this.toastService.showError('Failed to delete card');
                this.isDeleting = false;
                this.closeDeleteSheet();
            }
        });
    }

    closeDeleteSheet() {
        this.showDeleteSheet = false;
        this.cardToDelete = null;
        this.isDeleting = false;
    }

    editCard(card: Card) {
        this.router.navigate(['/cards/add'], { queryParams: { id: card.id } });
    }

    openAddCardModal() {
        this.router.navigate(['/cards/add']);
    }

    getBrandName(brand: 'visa' | 'mastercard' | 'rupay'): string {
        const brandMap = {
            'visa': 'VISA',
            'mastercard': 'MASTERCARD',
            'rupay': 'RUPAY'
        };
        return brandMap[brand];
    }



    // Card display methods
    getCardGradient(card: Card): string {
        if (!card.color) {
            // Default gradient if no color is set
            return card.type === 'credit' ? 'bg-gradient-to-br from-blue-600 to-purple-700' : 'bg-gradient-to-br from-emerald-600 to-teal-700';
        }

        // If color is a hex value, return empty string (we'll handle it with inline styles)
        if (card.color.startsWith('#')) {
            return '';
        }

        // Otherwise, it's a Tailwind gradient class
        return `bg-gradient-to-br ${card.color}`;
    }

    // Get CSS gradient style for hex colors
    getCardGradientStyle(card: Card): { [key: string]: string } | null {
        if (!card.color || !card.color.startsWith('#')) return null;

        // Create a darker shade for gradient end
        const hex = card.color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Create darker shade (multiply by 0.75)
        const darkerR = Math.max(0, Math.floor(r * 0.75));
        const darkerG = Math.max(0, Math.floor(g * 0.75));
        const darkerB = Math.max(0, Math.floor(b * 0.75));

        const darkerHex = `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;

        return {
            'background': `linear-gradient(to bottom right, ${card.color}, ${darkerHex})`
        };
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
