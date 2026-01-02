
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[200] flex items-end justify-center" role="dialog">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in" (click)="close()"></div>
        
        <!-- Sheet -->
        <div class="relative bg-white w-full max-w-lg mx-auto md:mb-4 md:rounded-[2.5rem] rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-10px_60px_rgba(0,0,0,0.15)] animate-slide-in-up"
             (click)="$event.stopPropagation()">
           
           <!-- Drag Handle -->
           <div class="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 cursor-grab active:cursor-grabbing"></div>
           
           <!-- Content Projection -->
           <ng-content></ng-content>
        </div>
      </div>
    }
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    .animate-slide-in-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
  `]
})
export class BottomSheetComponent {
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
