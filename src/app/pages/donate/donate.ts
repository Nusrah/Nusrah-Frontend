import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil, switchMap, distinctUntilChanged } from 'rxjs';

declare var Razorpay: any;

@Component({
  selector: 'app-donate',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './donate.html',
  styles: []
})
export class DonateComponent implements OnInit, OnDestroy {
  campaignId: string = '';
  campaign: any = null;
  loading: boolean = true;
  errorMessage: string = '';

  showProgressGallery: boolean = false;
  showMoreInfo: boolean = false;

  donationAmount: number = 500;
  presetAmounts: number[] = [500, 1000, 2500, 5000, 10000];
  donorEmail: string = '';
  donorMessage: string = '';
  isProcessingPayment: boolean = false;

  private apiUrl = 'http://localhost:8000';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdRef: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadRazorpayScript();

    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        const id = params.get('id') || params.get('campaignId') || this.route.snapshot.queryParamMap.get('id') || '';
        return [id];
      }),
      distinctUntilChanged(),
      switchMap(id => {
        this.loading = true;
        this.errorMessage = '';
        this.campaign = null;
        this.campaignId = id;

        console.log('Reactive stream -> Detected campaignId:', this.campaignId);

        if (!this.campaignId) {
          this.loading = false;
          this.errorMessage = 'Invalid campaign ID or link provided in the URL.';
          this.cdRef.detectChanges();
          return [];
        }

        return this.http.get<any>(`${this.apiUrl}/api/campaigns`);
      })
    ).subscribe({
      next: (res) => {
        if (!res) return;
        console.log('Raw API /api/campaigns response:', res);
        const campaigns = Array.isArray(res) ? res : (res.campaigns || res.data || []);
        
        this.campaign = campaigns.find((c: any) => String(c.id) === String(this.campaignId));
        console.log('Found campaign match:', this.campaign);

        if (this.campaign) {
          this.loading = false;
          this.cdRef.detectChanges(); // Force UI to render immediately
        } else {
          this.http.get<any>(`${this.apiUrl}/api/admin/campaigns`).subscribe({
            next: (adminRes) => {
              console.log('Raw Admin API response:', adminRes);
              const allCamps = Array.isArray(adminRes) ? adminRes : (adminRes.campaigns || adminRes.data || []);
              this.campaign = allCamps.find((c: any) => String(c.id) === String(this.campaignId));
              this.loading = false;
              if (!this.campaign) {
                this.errorMessage = `Campaign with ID "${this.campaignId}" was not found in database.`;
              }
              this.cdRef.detectChanges();
            },
            error: (err) => {
              console.error('Admin API error:', err);
              this.loading = false;
              this.errorMessage = 'Could not load campaign details from server.';
              this.cdRef.detectChanges();
            }
          });
        }
      },
      error: (err) => {
        console.error('Public API error:', err);
        this.loading = false;
        this.errorMessage = 'Failed to connect to backend server.';
        this.cdRef.detectChanges();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    if (!this.donationAmount || this.donationAmount <= 0) {
      alert('Please enter a valid donation amount.');
      return;
    }

    if (typeof Razorpay === 'undefined') {
      alert('Razorpay SDK failed to load. Please check your connection.');
      return;
    }

    this.isProcessingPayment = true;
    this.cdRef.detectChanges();

    this.http.post<any>(`${this.apiUrl}/api/create-order`, {
      amount: this.donationAmount,
      campaign_id: this.campaignId
    }).subscribe({
      next: (orderRes) => {
        if (!orderRes.success) {
          this.isProcessingPayment = false;
          this.cdRef.detectChanges();
          alert('Could not initialize payment order.');
          return;
        }

        const options = {
          key: orderRes.key_id,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: this.campaign?.title || 'Masjid Donation',
          description: `Donation to Campaign: ${this.campaignId}`,
          order_id: orderRes.order_id,
          handler: (response: any) => {
            this.verifyPaymentOnBackend({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              campaign_id: this.campaignId,
              amount: this.donationAmount,
              donor_email: this.donorEmail,
              message: this.donorMessage
            });
          },
          prefill: { email: this.donorEmail || '' },
          theme: { color: '#B5601F' },
          modal: { ondismiss: () => { this.isProcessingPayment = false; this.cdRef.detectChanges(); } }
        };

        const rzp = new Razorpay(options);
        rzp.open();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.cdRef.detectChanges();
        console.error('Order creation error:', err);
        alert(err.error?.detail || 'Failed to create payment order. Please try again.');
      }
    });
  }

  verifyPaymentOnBackend(paymentData: any): void {
    this.http.post<any>(`${this.apiUrl}/api/verify-payment`, paymentData).subscribe({
      next: (res) => {
        this.isProcessingPayment = false;
        if (res.success) {
          alert('Jazakallah Khair! Your donation was successful and recorded.');
          if (this.campaign) {
            this.campaign.raised = res.new_raised;
            if (res.new_reach !== undefined) {
              this.campaign.reach = res.new_reach;
            }
          }
          this.donorMessage = '';
        } else {
          alert('Payment verification failed.');
        }
        this.cdRef.detectChanges();
      },
      error: (err) => {
        this.isProcessingPayment = false;
        this.cdRef.detectChanges();
        console.error('Verification error:', err);
        alert(err.error?.detail || 'Payment signature verification failed on server.');
      }
    });
  }
}