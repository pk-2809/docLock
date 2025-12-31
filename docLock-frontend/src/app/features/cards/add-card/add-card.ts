import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Card, CardService } from '../../../core/services/card';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-add-card',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './add-card.html',
    styleUrl: './add-card.css'
})
export class AddCardComponent implements OnInit {
    router = inject(Router);
    route = inject(ActivatedRoute);
    toastService = inject(ToastService);
    cardService = inject(CardService);

    newCard: Partial<Card> = {
        name: '',
        type: 'credit',
        number: '',
        expiryDate: '',
        cvv: '',
        holderName: '',
        color: ''
    };

    selectedBrand: 'visa' | 'mastercard' | 'rupay' = 'visa';
    editingCard: Card | null = null;
    cardId: string | null = null;
    isLoading = false;

    // Standard app colors for random theming
    private standardColors = [
        'from-yellow-600 to-amber-700',
        'from-amber-600 to-orange-700',
        'from-orange-600 to-yellow-600',
        'from-yellow-500 to-amber-600',
        'from-amber-500 to-orange-600',
        'from-orange-500 to-yellow-500'
    ];

    ngOnInit() {
        // Check if editing a card
        this.route.queryParams.subscribe(params => {
            if (params['id']) {
                this.cardId = params['id'];
                this.loadCardForEdit();
            } else {
                this.resetNewCard();
            }
        });
    }

    private loadCardForEdit() {
        if (!this.cardId) return;
        this.isLoading = true;
        this.cardService.getCards().subscribe({
            next: (response) => {
                const card = response.cards.find(c => c.id === this.cardId);
                if (card) {
                    this.editingCard = card;
                    this.newCard = {
                        ...card,
                        number: this.formatCardNumber(card.number)
                    };
                    // Determine brand
                    if (card.bankName) {
                        const bankNameLower = card.bankName.toLowerCase();
                        if (bankNameLower.includes('rupay')) {
                            this.selectedBrand = 'rupay';
                        } else if (bankNameLower.includes('mastercard')) {
                            this.selectedBrand = 'mastercard';
                        } else {
                            this.selectedBrand = 'visa';
                        }
                    } else {
                        this.selectedBrand = 'visa';
                    }
                } else {
                    this.toastService.showError('Card not found');
                    this.router.navigate(['/cards']);
                }
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Failed to load card:', err);
                this.toastService.showError('Failed to load card details');
                this.router.navigate(['/cards']);
                this.isLoading = false;
            }
        });
    }

    getRandomColor(): string {
        return this.standardColors[Math.floor(Math.random() * this.standardColors.length)];
    }

    getBrandName(brand: 'visa' | 'mastercard' | 'rupay'): string {
        const brandMap = {
            'visa': 'VISA',
            'mastercard': 'MASTERCARD',
            'rupay': 'RUPAY'
        };
        return brandMap[brand];
    }

    formatCardNumber(number: string): string {
        if (!number) return '';
        return number.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
    }

    formatInputCardNumber(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(/\s/g, '');
        value = value.replace(/(.{4})/g, '$1 ').trim();
        this.newCard.number = value;
    }

    formatInputExpiry(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        this.newCard.expiryDate = value;
    }

    resetNewCard() {
        this.newCard = {
            name: '',
            type: 'credit',
            number: '',
            expiryDate: '',
            cvv: '',
            holderName: '',
            color: this.getRandomColor()
        };
        this.selectedBrand = 'visa';
        this.editingCard = null;
    }

    addCard() {
        if (!this.newCard.name || !this.newCard.number || !this.newCard.expiryDate || !this.newCard.cvv || !this.newCard.holderName) {
            this.toastService.showError('Please fill in all fields');
            return;
        }

        const cleanNumber = this.newCard.number.replace(/\s/g, '');

        // Prepare payload
        const cardData = {
            ...this.newCard,
            number: cleanNumber,
            bankName: this.getBrandName(this.selectedBrand),
            type: this.newCard.type as 'credit' | 'debit'
        };

        this.isLoading = true;

        if (this.editingCard && this.cardId) {
            // Update existing card
            this.cardService.updateCard(this.cardId, cardData).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card updated successfully!');
                    this.router.navigate(['/cards']);
                },
                error: (err) => {
                    console.error('Failed to update card:', err);
                    this.toastService.showError(err.error?.message || 'Failed to update card');
                    this.isLoading = false;
                }
            });
        } else {
            // Add new card
            this.cardService.createCard(cardData).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card added successfully!');
                    this.router.navigate(['/cards']);
                },
                error: (err) => {
                    console.error('Failed to add card:', err);
                    this.toastService.showError(err.error?.message || 'Failed to add card');
                    this.isLoading = false;
                }
            });
        }
    }
}
