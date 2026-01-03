import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth';

@Component({
    selector: 'app-qr-generate',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qr-generate.html',
    styleUrl: './qr-generate.css'
})
export class QrGenerateComponent {

}
