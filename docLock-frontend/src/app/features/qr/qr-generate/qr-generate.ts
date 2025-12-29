import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'app-qr-generate',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-generate.html',
    styleUrl: './qr-generate.css'
})
export class QrGenerateComponent {
    router = inject(Router);

    goBack() {
        this.router.navigate(['/dashboard']);
    }
}
