import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-about-us',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './about-us.html',
    styleUrl: './about-us.css'
})
export class AboutUsComponent {
    // Simple intersection observer logic can be added here or just CSS animations
    // detailed in CSS file.
}
