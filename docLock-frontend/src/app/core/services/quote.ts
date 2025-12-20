import { Injectable, signal } from '@angular/core';

export interface Quote {
    text: string;
    author?: string;
    type: 'fact' | 'thought';
}

@Injectable({
    providedIn: 'root'
})
export class QuoteService {
    currentQuote = signal<Quote | null>(null);
    ticks = signal<number>(0);

    private quotes: Quote[] = [
        { text: "Security is not a product, but a process.", author: "Bruce Schneier", type: 'thought' },
        { text: "Privacy is not an option, and it shouldn't be the price we accept for just getting on the internet.", author: "Gary Kovacs", type: 'thought' },
        { text: "Digital freedom stops where that of others begins.", author: "Antoine de Saint-Exupéry", type: 'thought' },
        { text: "Did you know? The first computer virus was created in 1971 and was named 'Creeper'.", type: 'fact' },
        { text: "Passwords are like underpants: change them often, keep them private, and never share them with anyone.", type: 'fact' },
        { text: "Encryption works. Properly implemented strong crypto systems are one of the few things that you can rely on.", author: "Edward Snowden", type: 'thought' },
        { text: "90% of passwords can be cracked in less than 6 hours.", type: 'fact' }
    ];

    constructor() {
        this.refreshQuote();

        // Auto refresh every 30 seconds
        setInterval(() => {
            this.refreshQuote();
        }, 30000);
    }

    refreshQuote() {
        const randomIndex = Math.floor(Math.random() * this.quotes.length);
        this.currentQuote.set(this.quotes[randomIndex]);
        this.ticks.update(t => t + 1);
    }
}
