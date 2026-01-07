import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        @for (toast of toastService.toasts(); track toast.id) {
            <div class="pointer-events-auto min-w-[400px] max-w-md p-4 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/10 animate-slide-in flex items-center gap-3"
                 [ngClass]="{
                    'bg-slate-900/90 text-white': true,
                    'shadow-green-500/20 border-green-500/20': toast.type === 'success',
                    'shadow-red-500/20 border-red-500/20': toast.type === 'error',
                    'shadow-blue-500/20 border-blue-500/20': toast.type === 'info'
                 }">

                <!-- Icon -->
                <div class="mt-0.5 shrink-0">
                    @if (toast.type === 'success') {
                        <svg class="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    @if (toast.type === 'error') {
                        <svg class="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                    @if (toast.type === 'info') {
                        <svg class="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    }
                </div>

                <!-- Message -->
                <div class="flex-1">
                    <p class="text-sm font-medium leading-5">
                        {{ toast.message }}
                    </p>
                </div>

                <!-- Close -->
                <button (click)="toastService.remove(toast.id)" class="shrink-0 text-slate-400 hover:text-white transition-colors">
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        }
    </div>
    `,
    styles: [`
        @keyframes slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
            animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
    `]
})
export class ToastComponent {
    toastService = inject(ToastService);
}
