import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';
import { AppSettingsService } from '../services/app-settings.service';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../auth/firebase';
import { Observable } from 'rxjs';

export interface Notification {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    read: boolean;
    icon?: string;
    metadata?: any;
    [key: string]: any; // Allow loose access
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private appSettings = inject(AppSettingsService);
    private apiUrl = `${this.appSettings.apiUrl}/api/notifications`;

    // State
    notifications = signal<Notification[]>([]);

    // Computed Properties
    unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

    constructor() { }

    private unsubscribeNotifications: (() => void) | null = null;

    subscribeToNotifications(uid: string) {
        if (this.unsubscribeNotifications) {
            this.unsubscribeNotifications();
        }

        const notificationsRef = collection(db, 'users', uid, 'notifications');
        // Sort by timestamp if possible, or just get all and sort in client.
        // Firestore requires composite index for complex queries, so let's sort in client for simplicity if volume is low.
        // Or use orderBy('createdAt', 'desc') if index exists. Let's try client sort first to avoid "index required" errors blocking the user.

        this.unsubscribeNotifications = onSnapshot(notificationsRef, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            // Client-side sort
            list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            this.notifications.set(list);
            console.log(`[NotificationService] Real-time updated: ${list.length}`);
        }, (error) => {
            console.error('[NotificationService] Real-time error:', error);
        });
    }

    clearSubscription() {
        if (this.unsubscribeNotifications) {
            this.unsubscribeNotifications();
            this.unsubscribeNotifications = null;
        }
        this.notifications.set([]);
    }

    // Deprecated: HTTP Fetch (Kept for reference)
    fetchNotifications(): Observable<any> {
        return new Observable(obs => {
            obs.next({ data: this.notifications() });
            obs.complete();
        });
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

    updateLocalNotification(id: string, updates: Partial<Notification>) {
        this.notifications.update(current =>
            current.map(n => n.id === id ? { ...n, ...updates } : n)
        );
    }
}
