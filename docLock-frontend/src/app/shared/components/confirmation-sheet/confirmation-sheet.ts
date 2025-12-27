import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-confirmation-sheet',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './confirmation-sheet.html',
    styleUrl: './confirmation-sheet.css'
})
export class ConfirmationSheetComponent implements OnInit, OnDestroy {
    @Input() title: string = 'Confirm Action';
    @Input() message: string = 'Are you sure you want to proceed?';
    @Input() confirmText: string = 'Yes, Confirm';
    @Input() cancelText: string = 'Cancel';
    @Input() type: 'danger' | 'warning' | 'info' | 'profile' = 'danger'; // profile = rose/user
    @Input() image: string | null = null;
    @Input() isLoading: boolean = false;

    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();

    ngOnInit() {
        document.body.style.overflow = 'hidden'; // Lock scroll
    }

    ngOnDestroy() {
        document.body.style.overflow = ''; // Unlock scroll
    }

    onConfirm() {
        if (this.isLoading) return;
        this.confirm.emit();
    }

    onCancel() {
        this.cancel.emit();
    }
}
