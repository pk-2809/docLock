import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, TemplateRef } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { SheetButton, SheetIcon, SheetConfig } from '../../models/ui.models';

@Component({
    selector: 'app-dynamic-sheet',
    standalone: true,
    imports: [CommonModule, NgTemplateOutlet],
    templateUrl: './dynamic-sheet.html',
    styleUrl: './dynamic-sheet.css'
})
export class DynamicSheetComponent implements OnInit, OnDestroy, OnChanges {
    @Input() isOpen = false;
    @Input() config: SheetConfig = {};
    @Input() customContent?: TemplateRef<any>;

    @Output() closed = new EventEmitter<void>();
    @Output() confirmed = new EventEmitter<void>();
    @Output() buttonClicked = new EventEmitter<string>();

    defaultConfig: SheetConfig = {
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        variant: 'info',
        showDragHandle: true,
        allowBackdropClose: true,
        buttons: [
            { label: 'Confirm', action: 'confirm', variant: 'primary' },
            { label: 'Cancel', action: 'cancel', variant: 'ghost' }
        ]
    };

    ngOnInit() {
        if (this.isOpen) {
            document.body.style.overflow = 'hidden';
        }
    }

    ngOnDestroy() {
        document.body.style.overflow = '';
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen']) {
            if (this.isOpen) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    }

    get mergedConfig(): SheetConfig {
        return { ...this.defaultConfig, ...this.config };
    }

    get iconConfig() {
        if (this.mergedConfig.icon) return this.mergedConfig.icon;

        // Default icons based on variant
        const variant = this.mergedConfig.variant || 'info';
        const iconMap: Record<string, SheetIcon> = {
            danger: {
                type: 'svg',
                content: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
                bgColor: 'bg-red-50',
                iconColor: 'bg-red-600'
            },
            warning: {
                type: 'svg',
                content: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                bgColor: 'bg-amber-50',
                iconColor: 'bg-amber-600'
            },
            success: {
                type: 'svg',
                content: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                bgColor: 'bg-green-50',
                iconColor: 'bg-green-600'
            },
            profile: {
                type: 'svg',
                content: 'M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z',
                bgColor: 'bg-pink-50',
                iconColor: 'bg-pink-600'
            },
            info: {
                type: 'svg',
                content: 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z',
                bgColor: 'bg-indigo-50',
                iconColor: 'bg-indigo-600'
            }
        };

        return iconMap[variant] || iconMap['info'];
    }

    getButtonClass(button: SheetButton): string {
        const baseClass = 'w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation';

        const variantClasses = {
            primary: 'text-white shadow-lg active:scale-[0.98]',
            secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
            danger: 'bg-red-600 text-white shadow-lg shadow-red-500/30 hover:bg-red-700 active:scale-[0.98]',
            ghost: 'text-slate-600 hover:text-slate-800'
        };

        let variant = button.variant || 'primary';

        // Auto-assign variant based on action if not specified
        if (!button.variant) {
            if (button.action === 'cancel') variant = 'ghost';
            else if (this.mergedConfig.variant === 'danger') variant = 'danger';
        }

        let classes = `${baseClass} ${variantClasses[variant]}`;

        // Add color based on sheet variant for primary buttons
        if (variant === 'primary' && this.mergedConfig.variant !== 'danger') {
            const colorMap: Record<string, string> = {
                info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30',
                success: 'bg-green-600 hover:bg-green-700 shadow-green-500/30',
                warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/30',
                profile: 'bg-pink-600 hover:bg-pink-700 shadow-pink-500/30'
            };
            classes += ` ${colorMap[this.mergedConfig.variant || 'info']}`;
        }

        return classes;
    }

    onBackdropClick() {
        if (this.mergedConfig.allowBackdropClose) {
            this.close();
        }
    }

    close() {
        this.closed.emit();
    }

    handleButtonClick(button: SheetButton) {
        if (button.disabled || button.loading) return;

        if (button.action === 'confirm') {
            this.confirmed.emit();
        } else if (button.action === 'cancel') {
            this.close();
        } else if (button.customHandler) {
            button.customHandler();
        }

        this.buttonClicked.emit(button.action);
    }
}
