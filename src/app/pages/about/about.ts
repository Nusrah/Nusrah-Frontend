import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.html',
  styleUrls: ['./about.scss']
})
export class AboutComponent {
  // Mobile-only dropdown state: sections are collapsed by default and can be opened independently.
  // From the `sm` breakpoint up every section is always shown and the toggle does nothing.
  private openSections = new Set<string>();

  toggleSection(key: string): void {
    if (this.openSections.has(key)) this.openSections.delete(key);
    else this.openSections.add(key);
  }

  isOpen(key: string): boolean {
    return this.openSections.has(key);
  }
}