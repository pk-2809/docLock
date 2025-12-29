import { Routes } from '@angular/router';
import { authGuard } from './guards/auth';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: '',
        loadComponent: () => import('./layouts/auth-layout/auth-layout').then(m => m.AuthLayoutComponent),
        children: [
            {
                path: 'login',
                loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
            },
            {
                path: 'signup',
                loadComponent: () => import('./features/auth/signup/signup').then(m => m.SignupComponent)
            },

            {
                path: 'auth/forgot-password',
                loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
            }
        ]
    },

    {
        path: '',
        loadComponent: () => import('./layouts/main-layout/main-layout').then(m => m.MainLayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/documents/document-list/document-list').then(m => m.DocumentListComponent)
            },
            {
                path: 'profile',
                loadComponent: () => import('./features/profile/profile').then(m => m.ProfileComponent)
            },
            {
                path: 'about-us',
                loadComponent: () => import('./features/profile/about-us/about-us').then(m => m.AboutUsComponent)
            },
            {
                path: 'scan',
                loadComponent: () => import('./features/qr/qr-scan/qr-scan').then(m => m.QrScanComponent)
            },
            {
                path: 'my-qr',
                loadComponent: () => import('./features/qr/qr-generate/qr-generate').then(m => m.QrGenerateComponent)
            },
            {
                path: 'friends',
                loadComponent: () => import('./features/people/friend-list/friend-list').then(m => m.FriendListComponent)
            },
            {
                path: 'add-friend',
                loadComponent: () => import('./features/people/add-friend/add-friend').then(m => m.AddFriendComponent)
            },
            {
                path: 'people/shared',
                loadComponent: () => import('./features/people/shared-docs/shared-docs').then(m => m.SharedDocsComponent)
            },
            {
                path: 'cards',
                loadComponent: () => import('./features/cards/card-list/card-list').then(m => m.CardListComponent)
            },
            {
                path: 'cards/add',
                loadComponent: () => import('./features/cards/add-card/add-card').then(m => m.AddCardComponent)
            },
            {
                path: 'documents',
                redirectTo: 'dashboard',
                pathMatch: 'full'
            },
            {
                path: 'notifications',
                loadComponent: () => import('./features/notifications/notifications').then(m => m.NotificationsComponent)
            },

        ]
    }
];
