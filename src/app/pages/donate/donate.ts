import { Component, OnInit, OnDestroy, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, map, switchMap, distinctUntilChanged, EMPTY } from 'rxjs';

declare var Razorpay: any;

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './donate.html'
})
export class DonateComponent implements OnInit, OnDestroy {
  campaignId = '';
  campaign: any = null;
  loading = true;
  errorMessage = '';
  showProgressGallery = false;
  showMoreInfo = false;
  donationAmount = 500;
  presetAmounts: number[] = [500, 1000, 2500, 5000, 10000];
  donorEmail = '';
  donorMessage = '';
  isProcessingPayment = false;
  private destroy$ = new Subject<void>();

  // ---- Mobile helpers ----
  showDonateBar = true;   // floating donate bar: visible until the donation box is on screen
  linkCopied = false;     // "Link copied" hint after sharing on browsers without the share sheet
  private donateObserver?: IntersectionObserver;

  // Watches the donation box (it only exists once the campaign has loaded). The bar shows only
  // while the box is still below the screen; it hides once the box is visible or already passed.
  @ViewChild('donateBox') set donateBoxRef(ref: ElementRef<HTMLElement> | undefined) {
    this.donateObserver?.disconnect();
    if (!ref || typeof IntersectionObserver === 'undefined') return;
    this.donateObserver = new IntersectionObserver(([entry]) => {
      const below = !entry.isIntersecting && entry.boundingClientRect.top > 0;
      if (below !== this.showDonateBar) {
        this.showDonateBar = below;
        this.cdRef.detectChanges();
      }
    });
    this.donateObserver.observe(ref.nativeElement);
  }

  get fundedPercent(): number {
    const goal = Number(this.campaign?.goal) || 0;
    if (!goal) return 0;
    return Math.min(100, Math.round(((Number(this.campaign?.raised) || 0) / goal) * 100));
  }

  get remaining(): number {
    return Math.max(0, (Number(this.campaign?.goal) || 0) - (Number(this.campaign?.raised) || 0));
  }

  // Share the campaign: native share sheet on phones (WhatsApp etc.), otherwise copy the link
  async share(): Promise<void> {
    const url = window.location.href;
    const title = this.campaign?.title || 'Nusrah campaign';
    const nav: any = navigator;
    try {
      if (nav.share) {
        await nav.share({ title, text: `Support "${title}" on Nusrah`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.linkCopied = true;
      this.cdRef.detectChanges();
      setTimeout(() => { this.linkCopied = false; this.cdRef.detectChanges(); }, 2000);
    } catch {
      // share sheet dismissed or clipboard unavailable: nothing to do
    }
  }

  constructor(private route: ActivatedRoute, private http: HttpClient, private cdRef: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadRazorpayScript();
    const find = (res: any) => ((Array.isArray(res) ? res : res.campaigns || res.data) || []).find((c: any) => String(c.id) === String(this.campaignId));
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      map(params => params.get('id') || params.get('campaignId') || this.route.snapshot.queryParamMap.get('id') || ''),
      distinctUntilChanged(),
      switchMap(id => {
        this.loading = true;
        this.errorMessage = '';
        this.campaign = null;
        this.campaignId = id;
        if (!id) {
          this.done('Invalid campaign ID or link provided in the URL.');
          return EMPTY;
        }
        return this.http.get<any>('/api/campaigns');
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        this.campaign = find(res);
        if (this.campaign) {
          this.done();
          return;
        }
                this.done(`Campaign with ID "${this.campaignId}" was not found in database.`);
      },
      error: (err) => {
        console.error('Public API error:', err);
        this.done('Failed to connect to backend server.');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.donateObserver?.disconnect();
  }

  private done(error = ''): void {
    this.loading = false;
    this.errorMessage = error;
    this.cdRef.detectChanges();
  }

  private paymentFailed(message: string): void {
    this.isProcessingPayment = false;
    this.cdRef.detectChanges();
    alert(message);
  }

  loadRazorpayScript(): void {
    if (document.getElementById('razorpay-checkout-script')) return;
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
  }

  selectPresetAmount(amount: number): void {
    this.donationAmount = amount;
  }

  payWithRazorpay(): void {
    if (!this.donationAmount || this.donationAmount <= 0) return alert('Please enter a valid donation amount.');
    if (typeof Razorpay === 'undefined') return alert('Razorpay SDK failed to load. Please check your connection.');
    this.isProcessingPayment = true;
    this.cdRef.detectChanges();
    this.http.post<any>('/api/create-order', { amount: this.donationAmount, campaign_id: this.campaignId }).subscribe({
      next: (orderRes) => {
        if (!orderRes.success) return this.paymentFailed('Could not initialize payment order.');
        new Razorpay({
          key: orderRes.key_id,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: this.campaign?.title || 'Masjid Donation',
          description: `Donation to Campaign: ${this.campaignId}`,
          order_id: orderRes.order_id,
          handler: (response: any) => this.verifyPaymentOnBackend({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            campaign_id: this.campaignId,
            amount: this.donationAmount,
            donor_email: this.donorEmail,
            message: this.donorMessage
          }),
          prefill: { email: this.donorEmail || '' },
          theme: { color: '#B5601F' },
          modal: { ondismiss: () => { this.isProcessingPayment = false; this.cdRef.detectChanges(); } }
        }).open();
      },
      error: (err) => {
        console.error('Order creation error:', err);
        this.paymentFailed(err.error?.detail || 'Failed to create payment order. Please try again.');
      }
    });
  }

  verifyPaymentOnBackend(paymentData: any): void {
    this.http.post<any>('/api/verify-payment', paymentData).subscribe({
      next: (res) => {
        this.isProcessingPayment = false;
        if (res.success) {
          alert('Jazakallah Khair! Your donation was successful and recorded.');
          if (this.campaign) {
            this.campaign.raised = res.new_raised;
            if (res.new_reach !== undefined) this.campaign.reach = res.new_reach;
          }
          this.donorMessage = '';
        } else {
          alert('Payment verification failed.');
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        console.error('Verification error:', err);
        this.paymentFailed(err.error?.detail || 'Payment signature verification failed on server.');
      }
    });
  }
}