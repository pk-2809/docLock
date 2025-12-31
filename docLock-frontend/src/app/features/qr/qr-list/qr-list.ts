import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth';
import { ToastService } from '../../../core/services/toast.service';
import html2canvas from 'html2canvas';

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
    selector: 'app-qr-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './qr-list.html',
    styleUrl: './qr-list.css'
})
export class QrListComponent implements OnInit {
    router = inject(Router);
    authService = inject(AuthService);
    toastService = inject(ToastService);

    qrCodeImageUrl: string | null = null; // For actual QR code image if available
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

    currentQR: QRCode | null = null; // Single QR code to display

    ngOnInit() {
        // Show first active QR code, or first QR code if none are active
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


    viewQR(qr: QRCode) {
        // Navigate to QR detail/view page
        this.router.navigate(['/qr/view', qr.id]);
    }

    editQR(qr: QRCode, event: Event) {
        event.stopPropagation();
        // Navigate to edit QR page
        this.router.navigate(['/qr/edit', qr.id]);
    }

    duplicateQR(qr: QRCode, event: Event) {
        event.stopPropagation();
        // Create a duplicate of the QR code
        const duplicate: QRCode = {
            ...qr,
            id: Date.now().toString(),
            name: `${qr.name} (Copy)`,
            createdAt: new Date(),
            scanCount: 0
        };
        this.qrCodes.unshift(duplicate);
    }

    toggleQRStatus(qr: QRCode, event: Event) {
        event.stopPropagation();
        qr.isActive = !qr.isActive;
    }

    deleteQR(qr: QRCode, event: Event) {
        event.stopPropagation();
        if (confirm(`Are you sure you want to delete "${qr.name}"?`)) {
            this.qrCodes = this.qrCodes.filter(q => q.id !== qr.id);
        }
    }

    getQRIcon(type: string): string {
        const icons = {
            profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
            contact: 'M10 2v20l-5.5-5.5L10 2z M14 2v20l5.5-5.5L14 2z',
            wifi: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
            url: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71m-4.71 4.71a5 5 0 0 0 7.07 7.07l1.71-1.71',
            text: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
            email: 'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',
            phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'
        };
        return icons[type as keyof typeof icons] || icons.text;
    }

    getTypeColor(type: string): string {
        const colors = {
            profile: 'bg-blue-100 text-blue-600',
            contact: 'bg-green-100 text-green-600',
            wifi: 'bg-purple-100 text-purple-600',
            url: 'bg-orange-100 text-orange-600',
            text: 'bg-gray-100 text-gray-600',
            email: 'bg-red-100 text-red-600',
            phone: 'bg-teal-100 text-teal-600'
        };
        return colors[type as keyof typeof colors] || colors.text;
    }

    formatDate(date: Date): string {
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;

        return date.toLocaleDateString();
    }

    getActiveQRCount(): number {
        return this.qrCodes.filter(qr => qr.isActive).length;
    }

    // Get display name from user or QR code
    getDisplayName(): string {
        if (!this.currentQR) return 'User Name';
        const user = this.authService.user();
        return user?.name || this.currentQR.name || 'User Name';
    }

    // Get display email from user
    getDisplayEmail(): string {
        const user = this.authService.user();
        // @ts-ignore - email might not be in the interface
        return user?.email || 'user@example.com';
    }

    // Get initials for avatar
    getInitials(): string {
        const name = this.getDisplayName();
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    // Get member since year
    getMemberSinceYear(): string {
        const user = this.authService.user();
        if (user?.createdAt) {
            return new Date(user.createdAt).getFullYear().toString();
        }
        return new Date().getFullYear().toString();
    }

    // Generate QR code image dynamically
    generateQRCode() {
        if (!this.currentQR) {
            this.qrCodeImageUrl = null;
            return;
        }

        this.isGeneratingQR = true;

        // Use QR Server API to generate QR code
        // This is a free service that generates QR codes without requiring any library
        const qrData = encodeURIComponent(this.currentQR.data);
        const size = 256; // QR code size in pixels
        const margin = 1; // Margin around QR code

        // Generate QR code URL using QR Server API
        // Using ECC level M for better error correction and smaller size
        this.qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${qrData}&margin=${margin}&color=000000&bgcolor=ffffff&ecc=M`;
    }

    // Generate a simple QR code pattern (8x8 grid) for fallback placeholder
    generateQRPattern(): boolean[] {
        // Simple pattern - fallback if QR code image fails to load
        const pattern: boolean[] = [];
        for (let i = 0; i < 64; i++) {
            // Create a simple checkerboard-like pattern
            const row = Math.floor(i / 8);
            const col = i % 8;
            // Add some fixed patterns (corners, alignment patterns)
            if ((row < 2 && col < 2) || (row < 2 && col >= 6) || (row >= 6 && col < 2)) {
                pattern.push(true); // Corner squares
            } else if ((row >= 2 && row < 6 && col >= 2 && col < 6)) {
                pattern.push((row + col) % 2 === 0); // Center pattern
            } else {
                pattern.push(Math.random() > 0.5); // Random pattern
            }
        }
        return pattern;
    }

    // Handle QR image load
    onQRImageLoad() {
        this.isGeneratingQR = false;
    }

    // Handle QR image error
    onQRImageError() {
        // If QR code image fails to load, try regenerating
        this.qrCodeImageUrl = null;
        setTimeout(() => {
            if (this.currentQR) {
                this.generateQRCode();
            }
        }, 1000);
    }

    // Download QR card as image
    downloadQRCard() {
        if (!this.currentQR) return;

        const cardElement = document.getElementById('qr-card-container');
        if (!cardElement) {
            this.toastService.showError('Card element not found');
            return;
        }

        this.toastService.showSuccess('Preparing download...');

        // Small delay to ensure any rendering is finished
        setTimeout(() => {
            html2canvas(cardElement, {
                scale: 3, // High quality
                useCORS: true, // Allow cross-origin images
                backgroundColor: null, // Transparent background or defined by CSS
                logging: false,
                allowTaint: true
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `DocLock-ID-${this.currentQR?.name.replace(/\s+/g, '-') || 'Card'}.png`;
                link.href = canvas.toDataURL('image/png');
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.toastService.showSuccess('Card downloaded successfully');
            }).catch(err => {
                console.error('Download failed', err);
                this.toastService.showError('Failed to generate image');
            });
        }, 100);
    }
}
