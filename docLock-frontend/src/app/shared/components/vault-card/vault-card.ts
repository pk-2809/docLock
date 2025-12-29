import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-vault-card',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="group flex items-center p-4 bg-white border border-slate-100/80 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ease-out cursor-pointer active:scale-[0.98]">
      <!-- Icon Container -->
      <div 
        class="w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform duration-200 group-hover:scale-105"
        [ngClass]="colorClass">
        {{ icon }}
      </div>
      
      <!-- Text Content -->
      <div class="ml-4 flex-1">
        <h3 class="text-base font-bold text-slate-800 leading-tight group-hover:text-slate-900">
          {{ title }}
        </h3>
        <p class="text-slate-500 text-sm mt-0.5 font-medium">
          {{ subtitle }}
        </p>
      </div>

      <!-- Arrow/Action -->
      <div class="pr-2 text-slate-300 group-hover:text-slate-400 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
        </svg>
      </div>
    </div>
  `,
    styles: []
})
export class VaultCardComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
    @Input() icon: string = '';
    @Input() colorClass: string = 'bg-slate-100 text-slate-600';
}
