import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
    selector: 'app-main-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink],
    templateUrl: './main-layout.html',
    styleUrl: './main-layout.css'
})
export class MainLayoutComponent { }
