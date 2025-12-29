
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DropdownOption {
    label: string;
    value: any;
}

@Component({
    selector: 'app-dropdown',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="relative w-full">
      <!-- Label -->
      @if (label) {
        <label class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">{{ label }}</label>
      }

      <!-- Trigger -->
      <div (click)="toggle()" 
           [class.opacity-60]="disabled"
           [class.cursor-not-allowed]="disabled"
           class="w-full bg-slate-50 border border-slate-200 text-slate-800 text-lg font-bold rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-100 active:scale-[0.99]"
           [ngClass]="{'ring-4 ring-indigo-500/10 border-indigo-500': isOpen}">
        
        <span class="truncate block">
            {{ getLabel(value) || placeholder }}
        </span>

        <!-- Chevron -->
        <svg class="w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ml-2" 
             [class.rotate-180]="isOpen" 
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>

      <!-- Backdrop (for clicking outside) -->
      @if (isOpen) {
        <div class="fixed inset-0 z-40" (click)="close()"></div>
      }

      <!-- Options List -->
      @if (isOpen) {
        <div class="absolute w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden max-h-60 overflow-y-auto animate-fade-in-down">
          @for (option of options; track option.value) {
            <div (click)="select(option)" 
                 class="px-5 py-4 cursor-pointer hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-between group"
                 [class.bg-indigo-50]="option.value === value"
                 [class.text-indigo-600]="option.value === value">
              
              <span class="font-bold truncate">{{ option.label }}</span>
              
              @if (option.value === value) {
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              }
            </div>
          }
          @if (options.length === 0) {
            <div class="px-5 py-4 text-slate-400 text-center font-medium">No options available</div>
          }
        </div>
      }
    </div>
  `,
    styles: [`
    .animate-fade-in-down { animation: fadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1); transform-origin: top center; }
    @keyframes fadeInDown {
      from { opacity: 0; transform: scaleY(0.95); }
      to { opacity: 1; transform: scaleY(1); }
    }
    
    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
  `]
})
export class DropdownComponent {
    @Input() label = '';
    @Input() placeholder = 'Select an option';
    @Input() options: DropdownOption[] = [];
    @Input() value: any = null;
    @Input() disabled = false;

    @Output() valueChange = new EventEmitter<any>();

    isOpen = false;

    toggle() {
        if (!this.disabled) {
            this.isOpen = !this.isOpen;
        }
    }

    close() {
        this.isOpen = false;
    }

    select(option: DropdownOption) {
        if (this.value !== option.value) {
            this.value = option.value;
            this.valueChange.emit(option.value);
        }
        this.close();
    }

    getLabel(val: any): string {
        const found = this.options.find(o => o.value === val);
        return found ? found.label : '';
    }
}
