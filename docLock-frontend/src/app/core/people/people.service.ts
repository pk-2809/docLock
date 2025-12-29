import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../auth/firebase';


export interface Friend {
    uid: string;
    name: string;
    profileImage?: string;
    addedAt?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PeopleService {
    private http = inject(HttpClient);
    // Auth injection removed to prevent circular dependency (Auth -> People -> Auth)
    private configService = inject(AppConfigService);
    private apiUrl = environment.apiUrl;

    friends = signal<Friend[]>([]);
    isLoading = signal<boolean>(false);
    loaded = signal<boolean>(false);

    private unsubscribeFriends: (() => void) | null = null;

    subscribeToFriends(uid: string) {
        if (this.unsubscribeFriends) {
            this.unsubscribeFriends(); // Clear existing listener if any
        }

        this.isLoading.set(true);
        const friendsRef = collection(db, 'users', uid, 'friends');

        this.unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
            const friendsList = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as Friend));
            this.friends.set(friendsList);
            this.loaded.set(true);
            this.isLoading.set(false);
            console.log(`[PeopleService] Real-time friends updated: ${friendsList.length}`);
        }, (error) => {
            console.error('[PeopleService] Real-time error:', error);
            this.isLoading.set(false);
        });
    }

    // Deprecated: HTTP Get (Kept for reference or explicit refresh if needed, but onSnapshot supercedes it)
    getFriends(): Observable<{ friends: Friend[] }> {
        return new Observable(obs => {
            obs.next({ friends: this.friends() });
            obs.complete();
        });
    }

    addFriend(targetUserId: string): Observable<any> {
        const config = this.configService.config();
        const currentFriendCount = this.friends().length;

        if (currentFriendCount >= config.maxFriendsAddLimit) {
            return new Observable(observer => {
                observer.error(new Error(`Friend limit reached. Max ${config.maxFriendsAddLimit} friends allowed.`));
            });
        }

        return this.http.post(`${this.apiUrl}/api/people/add`, { targetUserId }, { withCredentials: true });
        // No need to manually refresh getFriends() anymore, onSnapshot handles it!
    }

    getPublicProfile(userId: string): Observable<Partial<Friend>> {
        return this.http.get<Partial<Friend>>(`${this.apiUrl}/api/people/user/${userId}`, { withCredentials: true });
    }

    clearData() {
        if (this.unsubscribeFriends) {
            this.unsubscribeFriends();
            this.unsubscribeFriends = null;
        }
        this.friends.set([]);
        this.loaded.set(false);
        this.isLoading.set(false);
    }

    deleteFriend(friendId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/people/${friendId}`, { withCredentials: true });
    }

    shareItem(recipientUid: string, itemId: string, type: 'document' | 'card'): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/share`, { recipientUid, itemId, type }, { withCredentials: true });
    }

    requestItem(recipientUid: string, itemType: 'document' | 'card', itemName: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/request`, { recipientUid, itemType, itemName }, { withCredentials: true });
    }
}
