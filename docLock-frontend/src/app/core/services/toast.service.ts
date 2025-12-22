import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    toasts = signal<Toast[]>([]);
    private counter = 0;

    show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 4000) {
        const id = this.counter++;
        const newToast: Toast = { id, message, type };

        this.toasts.update(current => [...current, newToast]);

        setTimeout(() => {
            this.remove(id);
        }, duration);
    }

    showSuccess(message: string) {
        this.show(message, 'success');
    }

    showError(message: string) {
        this.show(message, 'error');
    }

    remove(id: number) {
        this.toasts.update(current => current.filter(t => t.id !== id));
    }
}
