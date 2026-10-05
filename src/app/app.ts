import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './components/shared/navbar/navbar';
import { FooterComponent } from './components/shared/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent {
  title = 'Nusrah';
  currentRoute = '';

  constructor(private router: Router) {
    // Set the initial route immediately upon loading/refreshing
    this.currentRoute = this.router.url;

    // Listen to subsequent route changes
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.urlAfterRedirects;
    });
  }

  // Returns true for public pages, false exclusively for /admin and /volunteer dashboards
  showNavbarFooter(): boolean {
    const url = this.currentRoute || this.router.url;
    return !url.startsWith('/admin') && !url.startsWith('/volunteer');
  }
}