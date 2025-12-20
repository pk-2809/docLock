import { Injectable, signal, effect } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    darkMode = signal<boolean>(true); // Default to dark for premium feel

    constructor() {
        // Load from local storage or system preference
        const stored = localStorage.getItem('doclock_theme');
        if (stored) {
            this.darkMode.set(stored === 'dark');
        } else {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.darkMode.set(systemDark);
        }

        // Effect to apply class
        effect(() => {
            const isDark = this.darkMode();
            if (isDark) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('doclock_theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('doclock_theme', 'light');
            }
        });
    }

    toggleTheme() {
        this.darkMode.update(d => !d);
    }
}
