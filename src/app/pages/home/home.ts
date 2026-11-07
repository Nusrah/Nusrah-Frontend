import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
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
  isWelcomeInfoOpen = false; // mobile welcome box: expanded or collapsed
  // lives on the class itself, so it resets on a full page load or refresh,
  // but clicking "Home" again inside the app doesn't bring the popup back
  private static welcomeShownThisLoad = false;

  // One verse per hero slide (Arabic text + meaning)
  heroVerses = [
    {
      arabic: 'وَمَا تُنفِقُوا مِنْ خَيْرٍ يُوَفَّ إِلَيْكُمْ وَأَنتُمْ لَا تُظْلَمُونَ',
      meaning: 'Whatever good you spend will be repaid to you in full, and you will not be wronged.',
      ref: 'Surah Al-Baqarah 2:272'
    },
    {
      arabic: 'وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ',
      meaning: 'Help one another in righteousness and piety.',
      ref: "Surah Al-Ma'idah 5:2"
    },
    {
      arabic: 'خُذْ مِنْ أَمْوَالِهِمْ صَدَقَةً تُطَهِّرُهُمْ وَتُزَكِّيهِم بِهَا',
      meaning: 'Take from their wealth a charity by which you purify them and cause them to grow.',
      ref: 'Surah At-Tawbah 9:103'
    }
  ];

  // ---- Mobile-only accordion data / state ----
  howSteps = [
    { t: 'Campaign Registration', d: 'Organizations or individuals submit their campaign with all required documents.' },
    { t: 'Verification', d: 'Our team reviews documents and performs background & field verification.' },
    { t: 'Campaign Published', d: 'Once approved, the campaign becomes visible on the platform.' },
    { t: 'Donate Directly', d: "Donors contribute directly to the organizer's official account or payment method." },
    { t: 'Receive Updates', d: 'Organizers regularly upload progress updates so donors can see real impact.' }
  ];
  private openHowSteps = new Set<number>();
  isZakatInfoOpen = false;

  zakatImportancePoints = [
    { b: 'Purification of Wealth:', t: 'Cleanses your earnings and possessions while bringing divine barakah (blessing).' },
    { b: 'Direct Social Impact:', t: 'Directly empowers the poor, needy, orphans, and distressed educational or medical cases without intermediaries.' },
    { b: 'Economic Circulation:', t: 'Prevents wealth concentration in few hands and fosters robust community solidarity and mutual trust.' }
  ];

  // Points shown in the welcome popup (desktop modal and mobile box)
  welcomePoints = [
    { b: '100% Reaches the Cause:', t: 'We never hold, deduct from, or take a cut of your donation at any stage.' },
    { b: 'Verified Campaigns Only:', t: "Every Masjid, orphanage, NGO, school, and medical case is reviewed by our team before it's published." },
    { b: 'Real Transparency:', t: 'Organizers share ongoing updates so you can see exactly how your contribution is making an impact.' },
    { b: 'Built on Trust & Accountability:', t: 'From Zakah to Sadaqah, give with confidence knowing where every rupee goes.' }
  ];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef, private router: Router) {}

  ngOnInit(): void {
    // welcome popup shows every time the website is opened or refreshed (once per page load)
    if (!HomeComponent.welcomeShownThisLoad) {
      this.isWelcomeModalOpen = true;
      HomeComponent.welcomeShownThisLoad = true;
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

  // Closes the welcome popup. If a route is passed (e.g. '/campaigns'), we go there straight away.
  closeWelcomeModal(route?: string): void {
    this.isWelcomeModalOpen = false;
    this.isWelcomeInfoOpen = false;
    if (route) this.router.navigate([route]);
  }

  toggleWelcomeInfo(): void {
    this.isWelcomeInfoOpen = !this.isWelcomeInfoOpen;
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

  toggleHowStep(i: number): void {
    if (this.openHowSteps.has(i)) this.openHowSteps.delete(i);
    else this.openHowSteps.add(i);
  }

  isHowStepOpen(i: number): boolean {
    return this.openHowSteps.has(i);
  }

  toggleZakatInfo(): void {
    this.isZakatInfoOpen = !this.isZakatInfoOpen;
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