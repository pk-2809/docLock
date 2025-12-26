import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface Notification {
    id: string;
    title: string;
    message: string;
    time: string;
    read: boolean;
    icon?: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/api/notifications`;

    // State
    notifications = signal<Notification[]>([]);

    // Computed Properties
    unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

    constructor() { }

    fetchNotifications() {
        return this.http.get<{ status: string, data: Notification[] }>(this.apiUrl).pipe(
            tap((res) => {
                this.notifications.set(res.data || []);
            })
        );
    }

    clearAll() {
        return this.http.post(`${this.apiUrl}/clear`, {}).pipe(
            tap(() => {
                this.notifications.set([]);
            })
        );
    }

    markAllAsRead() {
        return this.http.post(`${this.apiUrl}/mark-read`, {}).pipe(
            tap(() => {
                const updated = this.notifications().map(n => ({ ...n, read: true }));
                this.notifications.set(updated);
            })
        );
    }
}
