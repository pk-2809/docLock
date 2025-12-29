import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

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
    selector: 'app-qr-view',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-view.html',
    styleUrl: './qr-view.css'
})
export class QrViewComponent implements OnInit {
    router = inject(Router);
    route = inject(ActivatedRoute);
    
    qrCode: QRCode | null = null;
    showShareMenu = false;

    // Mock data - in real app this would come from a service
    mockQRCodes: QRCode[] = [
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
        }
    ];

    ngOnInit() {
        this.route.params.subscribe(params => {
            const id = params['id'];
            this.qrCode = this.mockQRCodes.find(qr => qr.id === id) || null;
        });
    }

    goBack() {
        this.router.navigate(['/qrs']);
    }

    editQR() {
        if (this.qrCode) {
            this.router.navigate(['/qr/edit', this.qrCode.id]);
        }
    }

    toggleActive() {
        if (this.qrCode) {
            this.qrCode.isActive = !this.qrCode.isActive;
        }
    }

    duplicateQR() {
        if (this.qrCode) {
            // Navigate to create with pre-filled data
            this.router.navigate(['/qr/create'], { 
                queryParams: { 
                    type: this.qrCode.type,
                    duplicate: this.qrCode.id 
                } 
            });
        }
    }

    deleteQR() {
        if (this.qrCode && confirm(`Are you sure you want to delete "${this.qrCode.name}"?`)) {
            // In real app, delete from service
            this.router.navigate(['/qrs']);
        }
    }

    toggleShareMenu() {
        this.showShareMenu = !this.showShareMenu;
    }

    shareQR(method: string) {
        this.showShareMenu = false;
        // Implement sharing logic
        console.log(`Sharing QR via ${method}`);
    }

    downloadQR() {
        // Implement QR download logic
        console.log('Downloading QR code');
    }

    getTypeIcon(type: string): string {
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
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}