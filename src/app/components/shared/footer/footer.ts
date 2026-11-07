import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.html',
  styleUrls: ['./footer.scss']
})
export class FooterComponent implements AfterViewInit, OnDestroy {
  currentYear: number = new Date().getFullYear();

  @ViewChild('footerEl') private footerEl!: ElementRef<HTMLElement>;
  private resizeObserver?: ResizeObserver;

  constructor(private zone: NgZone) {}

  // Publishes how much of the footer is currently visible in the viewport as the CSS variable
  // --footer-overlap (in px). Floating widgets such as the chatbot button can add this value to
  // their `bottom` offset so they stop right above the footer instead of sitting on top of it.
  private updateOverlap = (): void => {
    const footer = this.footerEl?.nativeElement;
    if (!footer) return;
    const rect = footer.getBoundingClientRect();
    const overlap = Math.min(rect.height, Math.max(0, window.innerHeight - rect.top));
    document.documentElement.style.setProperty('--footer-overlap', `${Math.round(overlap)}px`);
  };

  ngAfterViewInit(): void {
    // run outside Angular so scrolling doesn't trigger change detection
    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.updateOverlap, { passive: true });
      window.addEventListener('resize', this.updateOverlap);
      // page height changes (e.g. campaigns finish loading) without any scroll event
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.updateOverlap);
        this.resizeObserver.observe(document.body);
      }
    });
    this.updateOverlap();
  }

  ngOnDestroy(): void {
    window.removeEventListener('scroll', this.updateOverlap);
    window.removeEventListener('resize', this.updateOverlap);
    this.resizeObserver?.disconnect();
    document.documentElement.style.removeProperty('--footer-overlap');
  }
}