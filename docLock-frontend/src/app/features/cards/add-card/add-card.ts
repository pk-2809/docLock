import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { Card, CardService } from '../../../core/services/card';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth';

@Component({
    selector: 'app-add-card',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './add-card.html',
    styleUrl: './add-card.css'
})
export class AddCardComponent implements OnInit {
    authService = inject(AuthService);
    router = inject(Router);
    route = inject(ActivatedRoute);
    toastService = inject(ToastService);
    cardService = inject(CardService);
    cdr = inject(ChangeDetectorRef);

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
                setTimeout(() => {
                    this.isLoading = false;
                });
            },
            error: (err) => {
                console.error('Failed to load card:', err);
                this.toastService.showError('Failed to load card details');
                this.router.navigate(['/cards']);
                setTimeout(() => {
                    this.isLoading = false;
                });
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

    detectCardNetwork(number: string) {
        // Remove spaces
        const cleanNumber = number.replace(/\D/g, '');

        // Visa: Starts with 4
        if (/^4/.test(cleanNumber)) {
            this.selectedBrand = 'visa';
        }
        // Mastercard: Starts with 51-55 or 2221-2720
        else if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
            this.selectedBrand = 'mastercard';
        }
        // RuPay: Starts with 60, 6521, 6522
        // Note: RuPay ranges can be complex, catching common starts
        else if (/^60/.test(cleanNumber) || /^65/.test(cleanNumber) || /^8/.test(cleanNumber) || /^50/.test(cleanNumber)) {
            this.selectedBrand = 'rupay';
        }
        // Default to Visa if unknown (or keep previous)
    }

    formatInputCardNumber(event: Event) {
        const input = event.target as HTMLInputElement;
        // Remove non-digits
        let value = input.value.replace(/\D/g, '');

        // Auto-detect network
        this.detectCardNetwork(value);

        // Format with spaces every 4 digits
        if (value.length > 0) {
            value = value.match(/.{1,4}/g)?.join(' ') || value;
        }

        this.newCard.number = value;
        input.value = value;
    }

    formatInputName(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/[^a-zA-Z\s]/g, '');
        this.newCard.name = value;
        input.value = value;
    }

    formatInputHolderName(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/[^a-zA-Z\s]/g, '');
        this.newCard.holderName = value.toUpperCase();
        input.value = value.toUpperCase();
    }

    formatInputCVV(event: Event) {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/\D/g, '');
        this.newCard.cvv = value;
        input.value = value;
    }

    formatInputExpiry(event: Event) {
        const input = event.target as HTMLInputElement;
        let value = input.value.replace(/\D/g, '');

        if (value.length >= 2) {
            const month = parseInt(value.substring(0, 2));
            if (month > 12) {
                value = '12' + value.substring(2);
            } else if (month === 0) {
                // Optionally handle 00, but 01-12 is valid.
                // Leaving 0 as is might allow 01 typing.
            }
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }

        this.newCard.expiryDate = value;
        input.value = value; // Sync view
    }

    selectCardType(type: 'debit' | 'credit') {
        this.newCard.type = type;
        // Don't assign color here - it will be assigned on submit
    }

    resetNewCard() {
        // Don't set color initially - it will be set when user selects card type
        this.newCard = {
            name: '',
            type: 'credit',
            number: '',
            expiryDate: '',
            cvv: '',
            holderName: this.authService.user()?.name || '',
            color: '' // Will be set when card type is selected
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
            type: this.newCard.type as 'credit' | 'debit',
            // Assign random color only on submit (for new cards, preserve existing color for edits)
            color: this.editingCard ? (this.newCard.color || this.getRandomColor()) : this.getRandomColor()
        };

        this.isLoading = true;

        if (this.editingCard && this.cardId) {
            // Update existing card - preserve existing color if it exists
            this.cardService.updateCard(this.cardId, cardData).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card updated successfully!');
                    this.router.navigate(['/cards']);
                },
                error: (err) => {
                    console.error('Failed to update card:', err);
                    this.toastService.showError(err.error?.message || 'Failed to update card');
                    setTimeout(() => {
                        this.isLoading = false;
                    });
                }
            });
        } else {
            // Add new card - assign random color
            this.cardService.createCard(cardData).subscribe({
                next: () => {
                    this.toastService.showSuccess('Card added successfully!');
                    this.router.navigate(['/cards']);
                },
                error: (err) => {
                    console.error('Failed to add card:', err);
                    this.toastService.showError(err.error?.message || 'Failed to add card');
                    setTimeout(() => {
                        this.isLoading = false;
                    });
                }
            });
        }
    }
}
