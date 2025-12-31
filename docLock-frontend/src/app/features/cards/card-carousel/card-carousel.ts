import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Card } from '../../../core/services/card';

// Export Card interface for use in parent component 
// (Already exported from simple import, or just use imports in other files)

// Export Card interface for use in parent component

@Component({
    selector: 'app-card-carousel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './card-carousel.html',
    styleUrl: './card-carousel.css'
})
export class CardCarouselComponent implements OnInit {
    @Input() cards: Card[] = [];
    @Input() cardType: 'credit' | 'debit' = 'debit';
    @Input() indicatorColor: string = 'pink';
    @Input() cardVisibilityState = new Map<string, 'number' | 'cvv'>();

    // Methods passed from parent
    @Input() getCardGradient!: (card: Card) => string;
    @Input() getDisplayCardNumber!: (card: Card) => string;
    @Input() getDisplayCVV!: (card: Card) => string;
    @Input() formatCardNumber!: (number: string) => string;
    @Input() getMaskedCardNumber!: (number: string) => string;

    // Events
    @Output() toggleVisibility = new EventEmitter<string>();
    @Output() copyToClipboard = new EventEmitter<{ text: string, label: string }>();
    @Output() editCard = new EventEmitter<Card>();
    @Output() deleteCard = new EventEmitter<string>();

    selectedCardIndex = 0;
    carouselId = '';

    ngOnInit() {
        // Generate unique carousel ID
        this.carouselId = `${this.cardType}-carousel-${Date.now()}`;
    }

    scrollCarousel(event: Event) {
        const target = event.target as HTMLElement;
        const carouselContainer = target.querySelector('[style*="width: max-content"]') as HTMLElement;
        if (carouselContainer && carouselContainer.children.length > 0) {
            const firstCard = carouselContainer.children[0] as HTMLElement;
            const cardWidth = firstCard.offsetWidth;
            const gap = 16; // gap-4 = 1rem = 16px
            const scrollLeft = target.scrollLeft;
            this.selectedCardIndex = Math.round(scrollLeft / (cardWidth + gap));
        }
    }

    scrollToCard(index: number) {
        const carousel = document.getElementById(this.carouselId);
        if (carousel) {
            const carouselContainer = carousel.querySelector('[style*="width: max-content"]') as HTMLElement;
            if (carouselContainer && carouselContainer.children.length > 0) {
                const firstCard = carouselContainer.children[0] as HTMLElement;
                const cardWidth = firstCard.offsetWidth;
                const gap = 16; // gap-4 = 1rem = 16px
                carousel.scrollTo({ left: index * (cardWidth + gap), behavior: 'smooth' });
            }
        }
    }

    getCardScale(index: number): string {
        if (index === this.selectedCardIndex) return 'scale-100';
        return 'scale-95';
    }

    getCardOpacity(index: number): string {
        if (index === this.selectedCardIndex) return 'opacity-100';
        return 'opacity-70';
    }

    onToggleVisibility(cardId: string) {
        this.toggleVisibility.emit(cardId);
    }

    onCopyToClipboard(text: string, label: string, cardIndex: number) {
        if (!text || cardIndex !== this.selectedCardIndex) return;
        navigator.clipboard.writeText(text).then(() => {
            this.copyToClipboard.emit({ text, label });
        });
    }

    onCopyCardNumber(card: Card, cardIndex: number) {
        if (cardIndex !== this.selectedCardIndex) return;
        // Always copy the actual card number, not the masked version
        this.onCopyToClipboard(card.number, 'Card number', cardIndex);
    }

    onEditCard(card: Card) {
        this.editCard.emit(card);
    }

    onDeleteCard(cardId: string) {
        this.deleteCard.emit(cardId);
    }

    getCardTypeLabel(): string {
        return this.cardType === 'credit' ? 'CREDIT CARD' : 'DEBIT CARD';
    }

    getBrandName(): string {
        return this.cardType === 'credit' ? 'VISA' : 'MASTERCARD';
    }

    getIndicatorColorClasses(): string {
        const colorMap: Record<string, string> = {
            'pink': 'bg-pink-600',
            'blue': 'bg-blue-600',
            'emerald': 'bg-emerald-600'
        };
        return colorMap[this.indicatorColor] || 'bg-pink-600';
    }

    getIndicatorInactiveClasses(): string {
        const colorMap: Record<string, string> = {
            'pink': 'bg-pink-300',
            'blue': 'bg-blue-300',
            'emerald': 'bg-emerald-300'
        };
        return colorMap[this.indicatorColor] || 'bg-pink-300';
    }

    getCopyButtonColor(): string {
        if (this.cardType === 'credit') {
            return 'text-blue-500 hover:text-blue-600';
        }
        return 'text-emerald-500 hover:text-emerald-600';
    }

    getActionButtonColor(): string {
        if (this.cardType === 'credit') {
            return 'text-blue-600 hover:text-blue-700';
        }
        return 'text-emerald-600 hover:text-emerald-700';
    }
}
