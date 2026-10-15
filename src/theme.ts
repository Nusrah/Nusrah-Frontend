import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'nusrah-theme';
  isDarkMode = signal<boolean>(this.getInitialTheme());

  constructor() {
    this.applyTheme(this.isDarkMode());
  }

  toggleTheme(): void {
    const isDark = !this.isDarkMode();
    this.isDarkMode.set(isDark);
    localStorage.setItem(this.storageKey, isDark ? 'dark' : 'light');
    this.applyTheme(isDark);
  }

  private getInitialTheme(): boolean {
    try {
      return localStorage.getItem(this.storageKey) === 'dark';
    } catch {
      return false;
    }
  }

  private applyTheme(isDark: boolean): void {
    document.documentElement.classList.toggle('dark', isDark);
  }
}