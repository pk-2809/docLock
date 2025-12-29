import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-qr-create',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './qr-create.html',
    styleUrl: './qr-create.css'
})
export class QrCreateComponent implements OnInit {
    router = inject(Router);
    route = inject(ActivatedRoute);
    
    selectedType = 'text';
    qrName = '';
    qrData = '';
    
    // Form fields for different QR types
    profileData = {
        name: '',
        email: '',
        phone: '',
        website: ''
    };
    
    contactData = {
        firstName: '',
        lastName: '',
        organization: '',
        email: '',
        phone: '',
        website: ''
    };
    
    wifiData = {
        ssid: '',
        password: '',
        security: 'WPA',
        hidden: false
    };

    ngOnInit() {
        // Get type from query params if provided
        this.route.queryParams.subscribe(params => {
            if (params['type']) {
                this.selectedType = params['type'];
            }
        });
    }

    goBack() {
        this.router.navigate(['/qrs']);
    }

    onTypeChange(type: string) {
        this.selectedType = type;
        this.qrData = '';
    }

    generateQRData() {
        switch (this.selectedType) {
            case 'profile':
                return `BEGIN:VCARD\nVERSION:3.0\nFN:${this.profileData.name}\nEMAIL:${this.profileData.email}\nTEL:${this.profileData.phone}\nURL:${this.profileData.website}\nEND:VCARD`;
            case 'contact':
                return `BEGIN:VCARD\nVERSION:3.0\nFN:${this.contactData.firstName} ${this.contactData.lastName}\nORG:${this.contactData.organization}\nEMAIL:${this.contactData.email}\nTEL:${this.contactData.phone}\nURL:${this.contactData.website}\nEND:VCARD`;
            case 'wifi':
                return `WIFI:T:${this.wifiData.security};S:${this.wifiData.ssid};P:${this.wifiData.password};H:${this.wifiData.hidden};;`;
            case 'url':
            case 'email':
            case 'phone':
            case 'text':
            default:
                return this.qrData;
        }
    }

    createQR() {
        if (!this.qrName.trim()) {
            alert('Please enter a name for your QR code');
            return;
        }

        const finalData = this.generateQRData();
        if (!finalData.trim()) {
            alert('Please fill in the required information');
            return;
        }

        // Here you would typically save to a service
        console.log('Creating QR:', {
            name: this.qrName,
            type: this.selectedType,
            data: finalData
        });

        // Navigate back to QR list
        this.router.navigate(['/qrs']);
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
}