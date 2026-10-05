import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class LoginComponent implements OnInit {
  view: 'login' | 'forgot' | 'reset' = 'login';

  email: string = '';
  password: string = '';
  otp: string = '';
  newPassword: string = '';

  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  // True only when the backend confirms this email has no account.
  // Drives the "Oops!! seems like you have not registered yet" screen
  // with the Register button, instead of the generic error box.
  notRegistered: boolean = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Initialization logic if any
  }

  switchView(targetView: 'login' | 'forgot' | 'reset') {
    this.view = targetView;
    this.errorMessage = '';
    this.successMessage = '';
    this.notRegistered = false;
    this.cdr.detectChanges();
  }

  onLogin() {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      email: this.email.trim(),
      password: this.password.trim()
    };

    this.http.post<any>('http://localhost:8000/api/auth/login', payload).subscribe({
      next: (res) => {
        this.isLoading = false;

        // The backend now returns "access_token". Store it under a single,
        // consistent key so anything else in the app (guards, dashboards,
        // interceptors) that checks localStorage.getItem('token') finds it.
        const token = res.access_token || res.token || '';
        if (token) {
          localStorage.setItem('token', token);
        }

        // Pull the role from every place the backend might have put it,
        // in case the response shape differs from what we expect.
        const rawRole =
          res.role ||
          res.user_type ||
          res.profile?.role ||
          res.profile?.user_type ||
          '';

        const role = String(rawRole).trim().toLowerCase();
        localStorage.setItem('role', role);

        // IMPORTANT: AdminDashboardComponent and VolunteerDashboardComponent
        // both gate access by reading localStorage.getItem('user_profile'),
        // not 'token' or 'role'. Without this line, that check always fails
        // and you get bounced straight back to /login with an alert, even on
        // a fully successful login.
        const profile = res.profile || { email: this.email.trim(), role };
        localStorage.setItem('user_profile', JSON.stringify(profile));

        this.cdr.detectChanges();

        // Match on "contains" rather than strict equality, so values like
        // "Admin", "ADMIN ", or "administrator" still route correctly.
        if (role.includes('admin')) {
          this.router.navigate(['/admin']);
        } else if (role.includes('volunteer')) {
          this.router.navigate(['/volunteer']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Invalid email or password.';
        this.cdr.detectChanges();
      }
    });
  }

  onRequestOtp() {
    if (!this.email) {
      this.errorMessage = 'Please enter your email address.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.notRegistered = false;
    this.cdr.detectChanges();

    const payload = { email: this.email.trim() };

    this.http.post<any>('http://localhost:8000/api/auth/forgot-password', payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.view = 'reset';
        this.successMessage = res.message || 'OTP sent successfully to your email.';
        // Without this, a response that resolves outside Angular's zone
        // (e.g. when the fetch-based HttpClient backend is used) updates
        // these fields but never triggers a repaint, so the button stays
        // stuck on "Sending Code..." forever even though the call succeeded.
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;

        // Backend returns 404 specifically when the email has no matching
        // row in the "profiles" table -> show the "not registered" screen
        // with a Register button instead of a plain error message.
        if (err.status === 404) {
          this.notRegistered = true;
          this.errorMessage = '';
        } else {
          this.notRegistered = false;
          this.errorMessage = err.error?.detail || 'Failed to send OTP. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  onVerifyAndReset() {
    if (!this.otp || !this.newPassword) {
      this.errorMessage = 'Please provide both the OTP and your new password.';
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.detectChanges();

    const payload = {
      email: this.email.trim(),
      otp: this.otp.trim(),
      new_password: this.newPassword.trim()
    };

    // The backend is the source of truth for OTP correctness: it compares
    // this value against the "reset_otp" column it stored for this email
    // in forgot-password, and also checks "otp_expires_at" (10 minute
    // window). A wrong or expired code comes back as a 400 with a detail
    // message, which lands in errorMessage below.
    this.http.post<any>('http://localhost:8000/api/auth/reset-password', payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Password reset successfully.';
        this.cdr.detectChanges();

        setTimeout(() => {
          this.view = 'login';
          this.password = '';
          this.otp = '';
          this.newPassword = '';
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Failed to reset password. Check your OTP.';
        this.cdr.detectChanges();
      }
    });
  }
}