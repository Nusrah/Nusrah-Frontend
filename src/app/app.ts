import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './components/shared/navbar/navbar';
import { FooterComponent } from './components/shared/footer/footer';
import { ChatbotComponent } from './components/shared/chatbot/chatbot';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, FooterComponent, ChatbotComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class AppComponent {
  title = 'Nusrah';
  currentRoute = '';

  constructor(private router: Router) {
    this.currentRoute = this.router.url;
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe((event: any) => (this.currentRoute = event.urlAfterRedirects));
  }

  // the admin and volunteer dashboards hide the navbar and footer (and the chatbot)
  showNavbarFooter(): boolean {
    const url = this.currentRoute || this.router.url;
    return !url.startsWith('/admin') && !url.startsWith('/volunteer');
  }
}