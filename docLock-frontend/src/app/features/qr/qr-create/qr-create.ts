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
export class QrCreateComponent {

}