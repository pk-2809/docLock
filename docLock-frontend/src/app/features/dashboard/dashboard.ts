import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './dashboard.html',
    styleUrl: './dashboard.css'
})
export class DashboardComponent {
    authService = inject(AuthService);

    // Mock Stats Data (Replace with real data later)
    stats = {
        images: 128,
        cards: 12,
        shared: 5,
        friends: 24,
        storageUsed: 65 // percentage
    };

    get firstName(): string {
        const name = this.authService.user()?.name || 'User';
        return name.split(' ')[0];
    }
}
