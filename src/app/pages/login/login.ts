import { Component, ChangeDetectorRef } from '@angular/core';
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
export class LoginComponent {
  view: 'login' | 'forgot' | 'reset' = 'login';
  email = '';
  password = '';
  otp = '';
  newPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  notRegistered = false; // true only when the backend says this email has no account

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  switchView(targetView: 'login' | 'forgot' | 'reset') {
    this.view = targetView;
    this.errorMessage = this.successMessage = '';
    this.notRegistered = false;
    this.cdr.detectChanges();
  }

  private begin() {
    this.isLoading = true;
    this.errorMessage = this.successMessage = '';
    this.cdr.detectChanges();
  }

  private fail(message: string) {
    this.errorMessage = message;
    this.cdr.detectChanges();
  }

  private failWith(fallback: string) {
    return (err: any) => {
      this.isLoading = false;
      this.fail(err.error?.detail || fallback);
    };
  }

  onLogin() {
    this.begin();
    this.http.post<any>('/api/auth/login', { email: this.email.trim(), password: this.password.trim() }).subscribe({
      next: (res) => {
        this.isLoading = false;
        const token = res.access_token || res.token || '';
        if (token) localStorage.setItem('token', token);
        const role = String(res.role || res.user_type || res.profile?.role || res.profile?.user_type || '').trim().toLowerCase();
        localStorage.setItem('role', role);
        // the admin and volunteer dashboards check 'user_profile' to allow access
        localStorage.setItem('user_profile', JSON.stringify(res.profile || { email: this.email.trim(), role }));
        this.cdr.detectChanges();
        this.router.navigate([role.includes('admin') ? '/admin' : role.includes('volunteer') ? '/volunteer' : '/']);
      },
      error: this.failWith('Invalid email or password.')
    });
  }

  onRequestOtp() {
    if (!this.email) return this.fail('Please enter your email address.');
    this.notRegistered = false;
    this.begin();
    this.http.post<any>('/api/auth/forgot-password', { email: this.email.trim() }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.view = 'reset';
        this.successMessage = res.message || 'OTP sent successfully to your email.';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.notRegistered = err.status === 404; // backend returns 404 when the email isn't registered
        this.errorMessage = this.notRegistered ? '' : err.error?.detail || 'Failed to send OTP. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  onVerifyAndReset() {
    if (!this.otp || !this.newPassword) return this.fail('Please provide both the OTP and your new password.');
    this.begin();
    const payload = { email: this.email.trim(), otp: this.otp.trim(), new_password: this.newPassword.trim() };
    this.http.post<any>('/api/auth/reset-password', payload).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.successMessage = res.message || 'Password reset successfully.';
        this.cdr.detectChanges();
        setTimeout(() => {
          this.view = 'login';
          this.password = this.otp = this.newPassword = this.successMessage = '';
          this.cdr.detectChanges();
        }, 2000);
      },
      error: this.failWith('Failed to reset password. Check your OTP.')
    });
  }
}