import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('zakatSection') zakatSection!: ElementRef;

  stats = {
    active_campaigns: 0,
    active_volunteers: 0,
    finished_campaigns: 0,
    communities_supported: 0,
    total_donations_enabled: 0
  };
  
  campaigns: any[] = [];
  loading = true;

  // Featured Campaigns Slideshow State (auto-advances every 8s, loops, supports manual arrow navigation)
  currentSlideIndex = 0;
  private readonly SLIDESHOW_INTERVAL_MS = 8000;
  private slideshowTimer: any = null;

  // Zakat Calculator Modal State & Form Fields
  isZakatModalOpen = false;
  zakatForm = {
    cashOnHand: 0,
    goldValue: 0,
    silverValue: 0,
    businessAssets: 0,
    investments: 0,
    debts: 0
  };
  nisabThreshold = 45000; // Customizable benchmark value in currency units
  calculatedZakatResult: number | null = null;
  isEligibleForZakat = false;

  // Welcome / Trust Info Modal State (shown only on the visitor's first visit)
  isWelcomeModalOpen = false;
  private readonly WELCOME_MODAL_STORAGE_KEY = 'nusrah_hasSeenWelcomeModal';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Show the welcome/trust info popup only the very first time a visitor lands on the home page.
    // Once dismissed, we store a flag in localStorage so it never shows again on this browser.
    try {
      const hasSeenWelcomeModal = localStorage.getItem(this.WELCOME_MODAL_STORAGE_KEY);
      if (!hasSeenWelcomeModal) {
        this.isWelcomeModalOpen = true;
        localStorage.setItem(this.WELCOME_MODAL_STORAGE_KEY, 'true');
      }
    } catch (e) {
      // localStorage may be unavailable (e.g. privacy mode) — fail silently and simply skip the popup
      console.warn('Unable to access localStorage for welcome modal flag', e);
    }

    this.http.get<any>('http://127.0.0.1:8000/api/stats').subscribe({
      next: (res) => {
        if (res) {
          this.stats = {
            active_campaigns: res.active_campaigns ?? res.verified_campaigns ?? 0,
            active_volunteers: res.active_volunteers ?? res.volunteers ?? 0,
            finished_campaigns: res.finished_campaigns ?? 0,
            communities_supported: res.communities_supported ?? 15,
            total_donations_enabled: res.total_donations_enabled ?? 0
          };
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Failed to load stats from database', err)
    });

    // Fetches specifically the featured campaigns designated by the admin
    this.http.get<any>('http://127.0.0.1:8000/api/home/campaigns').subscribe({
      next: (res) => {
        const rawCampaigns = res.campaigns || res;
        this.campaigns = Array.isArray(rawCampaigns) ? rawCampaigns : [];
        this.loading = false;
        this.currentSlideIndex = 0;
        this.startSlideshowAutoplay();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load home campaigns from backend', err);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeWelcomeModal(): void {
    this.isWelcomeModalOpen = false;
  }

  ngOnDestroy(): void {
    this.stopSlideshowAutoplay();
  }

  // Starts (or restarts) the auto-advancing timer for the featured campaigns slideshow.
  // Only runs when there's more than one slide, since a single slide has nowhere to advance to.
  startSlideshowAutoplay(): void {
    this.stopSlideshowAutoplay();
    if (this.campaigns && this.campaigns.length > 1) {
      this.slideshowTimer = setInterval(() => {
        this.nextSlide();
      }, this.SLIDESHOW_INTERVAL_MS);
    }
  }

  stopSlideshowAutoplay(): void {
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = null;
    }
  }

  // Advances to the next slide, looping back to the first slide after the last one
  nextSlide(): void {
    if (!this.campaigns || this.campaigns.length === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.campaigns.length;
    this.startSlideshowAutoplay();
    this.cdr.detectChanges();
  }

  // Goes back to the previous slide, looping to the last slide from the first one
  prevSlide(): void {
    if (!this.campaigns || this.campaigns.length === 0) return;
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.campaigns.length) % this.campaigns.length;
    this.startSlideshowAutoplay();
    this.cdr.detectChanges();
  }

  // Jumps directly to a specific slide (used by the dot indicators) and resets the
  // autoplay timer so it doesn't unexpectedly advance right after a manual click
  goToSlide(index: number): void {
    this.currentSlideIndex = index;
    this.startSlideshowAutoplay();
  }

  scrollToZakat(): void {
    if (this.zakatSection) {
      this.zakatSection.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  openZakatModal(): void {
    this.isZakatModalOpen = true;
  }

  closeZakatModal(): void {
    this.isZakatModalOpen = false;
  }

  calculateZakat(): void {
    const totalAssets = 
      (Number(this.zakatForm.cashOnHand) || 0) +
      (Number(this.zakatForm.goldValue) || 0) +
      (Number(this.zakatForm.silverValue) || 0) +
      (Number(this.zakatForm.businessAssets) || 0) +
      (Number(this.zakatForm.investments) || 0);

    const netWealth = totalAssets - (Number(this.zakatForm.debts) || 0);
    
    if (netWealth >= this.nisabThreshold) {
      this.isEligibleForZakat = true;
      this.calculatedZakatResult = netWealth * 0.025; // 2.5% Zakat rate
    } else {
      this.isEligibleForZakat = false;
      this.calculatedZakatResult = 0;
    }
  }
}