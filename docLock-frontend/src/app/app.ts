import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { UpdateService } from './core/services/update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  title = 'docLock';
  private updateService = inject(UpdateService);

  ngOnInit() {
    this.updateService.init();
  }

  ngAfterViewInit() {
    // Artificial delay to show off the fancy animation, or just remove when ready
    setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('hidden');
        // Remove from DOM after fade out
        setTimeout(() => splash.remove(), 800);
      }
    }, 2000); // 2 seconds minimum display time
  }
}
