import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/auth/auth';
import { DynamicSheetComponent } from '../../shared/components/dynamic-sheet/dynamic-sheet';
import { SheetConfig } from '../../shared/models/ui.models';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, DynamicSheetComponent],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayoutComponent {
    activeTab = 'home';
    isFabOpen = false;

    private authService = inject(AuthService);
    private router = inject(Router);

    ngOnInit() {
        this.updateActiveTab(this.router.url);
        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                this.updateActiveTab(event.url);
            }
        });
    }

    private updateActiveTab(url: string) {
        if (url.includes('/dashboard') || url.includes('/documents')) this.activeTab = 'home';
        else if (url.includes('/friends')) this.activeTab = 'friends';
        else if (url.includes('/profile')) this.activeTab = 'profile';
    }

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

    showLogoutPopup = this.authService.showLogoutPopup;

    get logoutConfig(): SheetConfig {
        return {
            title: 'Logout?',
            message: 'Are you sure you want to sign out of DocLock?',
            variant: 'danger',
            buttons: [
                { label: 'Logout', action: 'confirm', variant: 'danger' },
                { label: 'Cancel', action: 'cancel' }
            ]
        };
    }

    logout() {
        this.authService.logout().subscribe({
            next: () => {
                this.router.navigate(['/login']);
                this.authService.showLogoutPopup.set(false);
            },
            error: () => {
                this.router.navigate(['/login']);
                this.authService.showLogoutPopup.set(false);
            }
        });
    }

    cancelLogout() {
        this.authService.showLogoutPopup.set(false);
    }
}
