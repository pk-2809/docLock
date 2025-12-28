import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';
import { AppConfigService } from '../services/app-config.service';
import { AuthService } from '../auth/auth';

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
    private authService = inject(AuthService); // Need to inject Auth to get/check counts if tracked there, or rely on local list length
    private configService = inject(AppConfigService);
    private apiUrl = environment.apiUrl;

    friends = signal<Friend[]>([]);
    isLoading = signal<boolean>(false);
    loaded = signal<boolean>(false);

    getFriends(): Observable<{ friends: Friend[] }> {
        return this.http.get<{ friends: Friend[] }>(`${this.apiUrl}/api/people`, { withCredentials: true })
            .pipe(
                tap(response => {
                    this.friends.set(response.friends || []);
                    this.loaded.set(true);
                })
            );
    }

    addFriend(targetUserId: string): Observable<any> {
        const config = this.configService.config();
        const currentFriendCount = this.friends().length;

        if (currentFriendCount >= config.maxFriendsAddLimit) {
            return new Observable(observer => {
                observer.error(new Error(`Friend limit reached. Max ${config.maxFriendsAddLimit} friends allowed.`));
            });
        }

        return this.http.post(`${this.apiUrl}/api/people/add`, { targetUserId }, { withCredentials: true })
            .pipe(
                tap(() => {
                    // Refresh friends list on success
                    this.getFriends().subscribe();
                })
            );
    }

    getPublicProfile(userId: string): Observable<Partial<Friend>> {
        return this.http.get<Partial<Friend>>(`${this.apiUrl}/api/people/user/${userId}`, { withCredentials: true });
    }

    deleteFriend(friendId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/people/${friendId}`, { withCredentials: true })
            .pipe(
                tap(() => {
                    // Optimistic update or refresh
                    this.friends.update(friends => friends.filter(f => f.uid !== friendId));
                })
            );
    }

    shareItem(recipientUid: string, itemId: string, type: 'document' | 'card'): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/share`, { recipientUid, itemId, type }, { withCredentials: true });
    }

    requestItem(recipientUid: string, itemType: 'document' | 'card', itemName: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/people/request`, { recipientUid, itemType, itemName }, { withCredentials: true });
    }
}
