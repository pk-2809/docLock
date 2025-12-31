import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';

interface QRCode {
    id: string;
    name: string;
    type: 'profile' | 'contact' | 'wifi' | 'url' | 'text' | 'email' | 'phone';
    data: string;
    createdAt: Date;
    lastUsed?: Date;
    scanCount: number;
    isActive: boolean;
}

@Component({
    selector: 'app-qr-generate',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-generate.html',
    styleUrl: './qr-generate.css'
})
export class QrGenerateComponent implements OnInit {
    router = inject(Router);
    authService = inject(AuthService);
    
    qrCodeImageUrl: string | null = null;
    isGeneratingQR: boolean = false;
    
    qrCodes: QRCode[] = [
        {
            id: '1',
            name: 'My Profile',
            type: 'profile',
            data: 'https://doclock.app/profile/user123',
            createdAt: new Date(),
            scanCount: 15,
            isActive: true
        },
        {
            id: '2',
            name: 'Business Contact',
            type: 'contact',
            data: 'BEGIN:VCARD\nVERSION:3.0\nFN:John Doe\nORG:DocLock\nEMAIL:john@doclock.app\nEND:VCARD',
            createdAt: new Date(Date.now() - 86400000),
            scanCount: 8,
            isActive: true
        },
        {
            id: '3',
            name: 'Office WiFi',
            type: 'wifi',
            data: 'WIFI:T:WPA;S:DocLock-Office;P:password123;H:false;;',
            createdAt: new Date(Date.now() - 172800000),
            scanCount: 23,
            isActive: true
        },
        {
            id: '4',
            name: 'Website Link',
            type: 'url',
            data: 'https://doclock.app',
            createdAt: new Date(Date.now() - 259200000),
            scanCount: 5,
            isActive: false
        }
    ];

    currentQR: QRCode | null = null;

    ngOnInit() {
        const selectedQR = this.qrCodes.find(qr => qr.isActive) || this.qrCodes[0] || null;
        this.setCurrentQR(selectedQR);
    }

    setCurrentQR(qr: QRCode | null) {
        this.currentQR = qr;
        if (this.currentQR) {
            this.generateQRCode();
        } else {
            this.qrCodeImageUrl = null;
        }
    }

    goBack() {
        this.router.navigate(['/dashboard']);
    }

    generateQRCode() {
        if (!this.currentQR) {
            this.qrCodeImageUrl = null;
            return;
        }
        
        this.isGeneratingQR = true;
        
        const qrData = encodeURIComponent(this.currentQR.data);
        const size = 256;
        const margin = 1;
        
        this.qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${qrData}&margin=${margin}&color=000000&bgcolor=ffffff&ecc=M`;
    }

    onQRImageLoad() {
        this.isGeneratingQR = false;
    }

    onQRImageError() {
        this.qrCodeImageUrl = null;
        setTimeout(() => {
            if (this.currentQR) {
                this.generateQRCode();
            }
        }, 1000);
    }

    downloadQRCard() {
        if (!this.currentQR) return;
        
        if (this.qrCodeImageUrl) {
            const link = document.createElement('a');
            link.href = this.qrCodeImageUrl;
            link.download = `qr-code-${this.currentQR.name.replace(/\s+/g, '-').toLowerCase()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            this.generateQRCode();
            setTimeout(() => {
                if (this.qrCodeImageUrl) {
                    const link = document.createElement('a');
                    link.href = this.qrCodeImageUrl;
                    link.download = `qr-code-${this.currentQR!.name.replace(/\s+/g, '-').toLowerCase()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            }, 500);
        }
    }

    getDisplayName(): string {
        if (!this.currentQR) return 'User Name';
        const user = this.authService.user();
        return user?.name || this.currentQR.name || 'User Name';
    }

    getDisplayEmail(): string {
        const user = this.authService.user();
        // @ts-ignore - email might not be in the interface
        return user?.email || 'user@example.com';
    }

    getInitials(): string {
        const name = this.getDisplayName();
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    getMemberSinceYear(): string {
        const user = this.authService.user();
        if (user?.createdAt) {
            return new Date(user.createdAt).getFullYear().toString();
        }
        return new Date().getFullYear().toString();
    }
}
