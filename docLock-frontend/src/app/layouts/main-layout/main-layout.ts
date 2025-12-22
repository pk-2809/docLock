import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
    activeTab = 'home';
    isFabOpen = false;

    private authService = inject(AuthService);
    private router = inject(Router);

    toggleFab() {
        this.isFabOpen = !this.isFabOpen;
    }

    closeFab() {
        this.isFabOpen = false;
    }

    setActive(tab: string) {
        this.activeTab = tab;
        this.closeFab();
    }

    logout() {
        if (confirm('Are you sure you want to logout?')) {
            this.authService.logout().subscribe({
                next: () => this.router.navigate(['/login']),
                error: () => this.router.navigate(['/login']) // Force redirect even on error
            });
        }
    }
}
