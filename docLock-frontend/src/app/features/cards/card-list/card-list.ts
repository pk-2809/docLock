import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-card-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './card-list.html',
    styleUrl: './card-list.css'
})
export class CardListComponent {
    // TODO: Implement card list logic
}
