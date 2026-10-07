import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class RegisterComponent implements OnDestroy {
  fullName = '';
  email = '';
  password = '';
  confirmPassword = '';
  phone = '';
  city = '';
  bio = '';
  referral = '';
  errorMessage = '';
  showSuccessModal = false;
  countdownSeconds = 10;
  private timerInterval: any = null;

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.clearTimer();
  }

  scrollToRegistration(): void {
    document.getElementById('registration-steps-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  get hasMinLength(): boolean { return this.password.length >= 5; }
  get hasLowercase(): boolean { return /[a-z]/.test(this.password); }
  get hasUppercase(): boolean { return /[A-Z]/.test(this.password); }
  get hasSpecialChar(): boolean { return /[^A-Za-z0-9]/.test(this.password); }

  onRegister(): void {
    // first failing rule wins; phone is 10 digits not starting with 0
    const error =
      !this.fullName.trim() || !/^[A-Za-z\s]+$/.test(this.fullName) ? 'Full Name must contain only text/letters.'
      : !this.email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.email) ? 'Please enter a valid email address (e.g., xxxxxxx@gmail.com).'
      : !this.hasMinLength || !this.hasLowercase || !this.hasUppercase || !this.hasSpecialChar ? 'Password does not meet all security requirements.'
      : this.password !== this.confirmPassword ? 'Passwords do not match.'
      : !this.phone || !/^[1-9][0-9]{9}$/.test(this.phone) ? 'Phone number must be exactly 10 digits and cannot start with 0.'
      : !this.city.trim() || !/^[A-Za-z\s,]+$/.test(this.city) ? 'City must contain only text (e.g., City, State).'
      : '';
    this.errorMessage = error;
    if (error) return this.cdr.detectChanges();

    const payload = {
      full_name: this.fullName.trim(),
      email: this.email.trim(),
      password: this.password,
      phone: this.phone.trim(),
      city: this.city.trim(),
      bio: this.bio,
      referral: this.referral ? this.referral.trim() : null,
      role: 'volunteer',
      approval_status: 'pending'
    };
    this.http.post<any>('/api/auth/register', payload).subscribe({
      next: () => {
        this.countdownSeconds = 10;
        this.showSuccessModal = true;
        this.cdr.detectChanges();
        this.startCountdown();
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Registration failed. Please check your details.';
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }

  startCountdown(): void {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.countdownSeconds--;
      this.cdr.detectChanges();
      if (this.countdownSeconds <= 0) this.closeModalAndRedirect();
    }, 1000);
  }

  clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  closeModalAndRedirect(): void {
    this.clearTimer();
    this.showSuccessModal = false;
    this.cdr.detectChanges();
    this.router.navigate(['/login']);
  }
}