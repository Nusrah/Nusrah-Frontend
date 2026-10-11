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
  stats = { active_campaigns: 0, active_volunteers: 0, finished_campaigns: 0, communities_supported: 0, total_donations_enabled: 0 };
  campaigns: any[] = [];
  loading = true;
  heroSlideIndex = 0;
  private readonly HERO_SLIDE_COUNT = 3;
  private readonly HERO_SLIDESHOW_INTERVAL_MS = 8000;
  private heroTimer: any = null;
  showSwipeHint = true;
  private hintTimer: any = null;
  private touchStartX = 0;
  private touchStartY = 0;
  isZakatModalOpen = false;
  zakatForm = { cashOnHand: 0, goldValue: 0, silverValue: 0, businessAssets: 0, investments: 0, debts: 0 };
  nisabThreshold = 45000;
  calculatedZakatResult: number | null = null;
  isEligibleForZakat = false;
  isWelcomeModalOpen = false;
  private readonly WELCOME_MODAL_STORAGE_KEY = 'nusrah_hasSeenWelcomeModal';

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // welcome popup shows only on a visitor's first visit; the flag lives in localStorage
    try {
      if (!localStorage.getItem(this.WELCOME_MODAL_STORAGE_KEY)) {
        this.isWelcomeModalOpen = true;
        localStorage.setItem(this.WELCOME_MODAL_STORAGE_KEY, 'true');
      }
    } catch (e) {
      console.warn('Unable to access localStorage for welcome modal flag', e);
    }
    this.startHeroAutoplay();
    // phone-only swipe hint: shown on every visit, hides on the first swipe or after 6 seconds
    this.hintTimer = setTimeout(() => this.dismissSwipeHint(), 6000);
    this.http.get<any>('/api/stats').subscribe({
      next: (res) => {
        if (!res) return;
        this.stats = {
          active_campaigns: res.active_campaigns ?? res.verified_campaigns ?? 0,
          active_volunteers: res.active_volunteers ?? res.volunteers ?? 0,
          finished_campaigns: res.finished_campaigns ?? 0,
          communities_supported: res.communities_supported ?? 15,
          total_donations_enabled: res.total_donations_enabled ?? 0
        };
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load stats from database', err)
    });
    this.http.get<any>('/api/home/campaigns').subscribe({
      next: (res) => {
        const rawCampaigns = res.campaigns || res;
        this.campaigns = Array.isArray(rawCampaigns) ? rawCampaigns : [];
        this.finishLoading();
      },
      error: (err) => {
        console.error('Failed to load home campaigns from backend', err);
        this.finishLoading();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopHeroAutoplay();
    clearTimeout(this.hintTimer);
  }

  private finishLoading(): void {
    this.loading = false;
    this.cdr.detectChanges();
  }

  closeWelcomeModal(): void {
    this.isWelcomeModalOpen = false;
  }

  startHeroAutoplay(): void {
    this.stopHeroAutoplay();
    this.heroTimer = setInterval(() => this.nextHeroSlide(), this.HERO_SLIDESHOW_INTERVAL_MS);
  }

  stopHeroAutoplay(): void {
    clearInterval(this.heroTimer);
    this.heroTimer = null;
  }

  goToHeroSlide(index: number): void {
    this.heroSlideIndex = index;
    this.cdr.detectChanges();
  }

  nextHeroSlide(): void {
    this.goToHeroSlide((this.heroSlideIndex + 1) % this.HERO_SLIDE_COUNT);
  }

  prevHeroSlide(): void {
    this.goToHeroSlide((this.heroSlideIndex - 1 + this.HERO_SLIDE_COUNT) % this.HERO_SLIDE_COUNT);
  }

  onHeroTouchStart(e: TouchEvent): void {
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.stopHeroAutoplay();
  }

  onHeroTouchEnd(e: TouchEvent): void {
    const dx = e.changedTouches[0].clientX - this.touchStartX;
    const dy = e.changedTouches[0].clientY - this.touchStartY;
    // only a mostly-horizontal drag of 50px or more counts as a swipe
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) this.nextHeroSlide();
      else this.prevHeroSlide();
      this.dismissSwipeHint();
    }
    this.startHeroAutoplay();
  }

  dismissSwipeHint(): void {
    this.showSwipeHint = false;
    clearTimeout(this.hintTimer);
    this.cdr.detectChanges();
  }

  getPercent(camp: any): number {
    return Math.min(100, ((Number(camp.raised) || 0) / (Number(camp.goal ?? camp.budget) || 1)) * 100);
  }

  scrollToZakat(): void {
    this.zakatSection?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  openZakatModal(): void {
    this.isZakatModalOpen = true;
  }

  closeZakatModal(): void {
    this.isZakatModalOpen = false;
  }

  calculateZakat(): void {
    const f = this.zakatForm;
    const n = (v: number) => Number(v) || 0;
    const netWealth = n(f.cashOnHand) + n(f.goldValue) + n(f.silverValue) + n(f.businessAssets) + n(f.investments) - n(f.debts);
    this.isEligibleForZakat = netWealth >= this.nisabThreshold;
    this.calculatedZakatResult = this.isEligibleForZakat ? netWealth * 0.025 : 0; // 2.5% Zakat rate
  }
}