import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-friend-list',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './friend-list.html',
    styleUrl: './friend-list.css'
})
export class FriendListComponent {
    // TODO: Implement friend list logic
}
