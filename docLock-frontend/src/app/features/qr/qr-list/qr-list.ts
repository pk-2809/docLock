import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-qr-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './qr-list.html',
    styleUrl: './qr-list.css'
})
export class QrListComponent implements OnInit {
    ngOnInit(): void {
        console.log("qr list");
    }
}
