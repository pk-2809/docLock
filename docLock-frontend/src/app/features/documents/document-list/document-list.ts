import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService } from '../../../core/services/document';
import { ActivatedRoute, Router } from '@angular/router';
import { FileSystemItem } from '../../../core/models/filesystem.model';

@Component({
    selector: 'app-document-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './document-list.html',
    styles: [`
    .grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 1rem; }
  `]
})
export class DocumentListComponent {
    // TODO: Implement document list logic
}
