import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeopleService, Friend } from '../../../core/people/people.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-share-bottom-sheet',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './share-bottom-sheet.html',
    styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    .animate-slide-in-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class ShareBottomSheetComponent {
    @Input() isOpen = false;
    @Input() itemToShare: { id: string, name: string, type: 'document' | 'card' } | null = null;
    @Output() closed = new EventEmitter<void>();

    peopleService = inject(PeopleService);
    toastService = inject(ToastService);

    searchQuery = signal('');
    sharingWithId = signal<string | null>(null);

    friends = this.peopleService.friends;

    filteredFriends = computed(() => {
        const query = this.searchQuery().toLowerCase().trim();
        if (!query) return this.friends();
        return this.friends().filter(f => f.name.toLowerCase().includes(query) || f.email?.toLowerCase().includes(query));
    });

    close() {
        this.isOpen = false;
        this.closed.emit();
        this.searchQuery.set('');
        this.sharingWithId.set(null);
    }

    shareWith(friend: Friend) {
        if (!this.itemToShare || this.sharingWithId()) return;

        this.sharingWithId.set(friend.uid);
        this.peopleService.shareItem(friend.uid, this.itemToShare.id, this.itemToShare.type).subscribe({
            next: () => {
                this.toastService.showSuccess(`Shared with ${friend.name}`);
                this.sharingWithId.set(null);
                this.close();
            },
            error: (err) => {
                console.error('Share failed', err);
                this.toastService.showError('Failed to share item');
                this.sharingWithId.set(null);
            }
        });
    }

    // Avatar gradient classes (matching friend-list)
    getAvatarGradient(index: number): string {
        const gradients = [
            'bg-gradient-to-br from-pink-500 to-rose-600',
            'bg-gradient-to-br from-emerald-500 to-teal-600',
            'bg-gradient-to-br from-purple-500 to-violet-600',
            'bg-gradient-to-br from-blue-500 to-indigo-600',
            'bg-gradient-to-br from-amber-500 to-orange-600',
            'bg-gradient-to-br from-cyan-500 to-blue-600',
        ];
        return gradients[index % gradients.length];
    }
}
