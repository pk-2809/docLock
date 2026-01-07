import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { collection, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../auth/firebase';


export interface Friend {
    uid: string;
    name: string;
    email?: string;
    profileImage?: string;
    addedAt?: string;
    isVerified?: boolean;
    sharedDocs?: number;
    sharedCards?: number;
    activeRequests?: number;
    recentActivity?: Array<{
        id: number;
        description: string;
        time: string;
    }>;
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

    private currentUserId: string | null = null;

    subscribeToFriends(uid: string) {
        this.currentUserId = uid; // Capture ID for updates
        if (this.unsubscribeFriends) {
            this.unsubscribeFriends(); // Clear existing listener if any
        }

        this.isLoading.set(true);
        const friendsRef = collection(db, 'users', uid, 'friends');

        this.unsubscribeFriends = onSnapshot(friendsRef, (snapshot) => {
            const friendsList = snapshot.docs.map(doc => {
                const data = doc.data();
                // console.log('Raw Friend Data:', data); // Debugging field names
                return { uid: doc.id, ...data } as Friend;
            });
            this.friends.set(friendsList);
            console.log(`[PeopleService] Real-time friends updated: ${friendsList.length}`);
            this.loaded.set(true);
            this.isLoading.set(false);
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
        this.currentUserId = null;
    }

    deleteFriend(friendId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/people/${friendId}`, { withCredentials: true });
    }

    shareItem(recipientUid: string, itemId: string, type: 'document' | 'card', requestId?: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/share`, { recipientUid, itemId, type, requestId }, { withCredentials: true }).pipe(
            tap(async () => {
                // Persist Update to Firestore
                if (this.currentUserId) {
                    const friendDocRef = doc(db, 'users', this.currentUserId, 'friends', recipientUid);
                    const fieldToUpdate = (type === 'document') ? 'sharedDocs' : 'sharedCards';
                    try {
                        await updateDoc(friendDocRef, {
                            [fieldToUpdate]: increment(1)
                        });
                        console.log(`[PeopleService] Incrementing ${fieldToUpdate} for friend ${recipientUid}`);
                    } catch (err) {
                        console.error('[PeopleService] Failed to persist stats:', err);
                    }
                }
            })
        );
    }

    requestItem(recipientUid: string, itemType: 'document' | 'card', itemName: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/request`, { recipientUid, itemType, itemName }, { withCredentials: true }).pipe(
            tap(async () => {
                // Persist Update to Firestore
                if (this.currentUserId) {
                    const friendDocRef = doc(db, 'users', this.currentUserId, 'friends', recipientUid);
                    try {
                        await updateDoc(friendDocRef, {
                            activeRequests: increment(1)
                        });
                        console.log(`[PeopleService] Incrementing activeRequests for friend ${recipientUid}`);
                    } catch (err) {
                        console.error('[PeopleService] Failed to persist request stats:', err);
                    }
                }
            })
        );
    }
}
