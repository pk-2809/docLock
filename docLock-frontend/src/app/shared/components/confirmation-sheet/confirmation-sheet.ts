import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirmation-sheet',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirmation-sheet.html',
    styleUrl: './confirmation-sheet.css'
})
export class ConfirmationSheetComponent {
    @Input() title: string = 'Confirm Action';
    @Input() message: string = 'Are you sure you want to proceed?';
    @Input() confirmText: string = 'Yes, Confirm';
    @Input() cancelText: string = 'Cancel';
    @Input() type: 'danger' | 'warning' | 'info' = 'danger'; // danger = red button, info = blue

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    onConfirm() {
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}
