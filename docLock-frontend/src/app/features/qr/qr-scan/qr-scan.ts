import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-qr-scan',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-scan.html',
    styleUrl: './qr-scan.css'
})
export class QrScanComponent implements OnInit, OnDestroy {
    isScanning = false;
    scanResult = '';
    hasCamera = false;
    scanHistory: any[] = [
        {
            id: '1',
            type: 'document',
            title: 'Passport Document',
            time: '2 minutes ago',
            icon: '🛂',
            color: 'from-blue-500 to-cyan-500'
        },
        {
            id: '2',
            type: 'contact',
            title: 'Dr. Smith Contact',
            time: '1 hour ago',
            icon: '👨‍⚕️',
            color: 'from-green-500 to-teal-500'
        },
        {
            id: '3',
            type: 'url',
            title: 'Insurance Portal',
            time: '3 hours ago',
            icon: '🔗',
            color: 'from-purple-500 to-pink-500'
        }
    ];

    ngOnInit() {
        this.checkCameraPermission();
    }

    ngOnDestroy() {
        this.stopScanning();
    }

    async checkCameraPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.hasCamera = true;
            stream.getTracks().forEach(track => track.stop());
        } catch (error) {
            this.hasCamera = false;
            console.error('Camera permission denied:', error);
        }
    }

    startScanning() {
        this.isScanning = true;
        // TODO: Implement actual QR scanning logic
        console.log('Starting QR scan...');
    }

    stopScanning() {
        this.isScanning = false;
        console.log('Stopping QR scan...');
    }

    toggleScanning() {
        if (this.isScanning) {
            this.stopScanning();
        } else {
            this.startScanning();
        }
    }

    onScanResult(result: string) {
        this.scanResult = result;
        this.isScanning = false;
        console.log('QR Code scanned:', result);
    }

    clearResult() {
        this.scanResult = '';
    }

    openScanHistory(item: any) {
        console.log('Opening scan history item:', item);
    }
}
