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

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // Smooth scroll method to jump directly to the steps section and form
  scrollToRegistration(): void {
    const element = document.getElementById('registration-steps-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Password requirement live check getters
  get hasMinLength(): boolean {
    return this.password.length >= 5;
  }

  get hasLowercase(): boolean {
    return /[a-z]/.test(this.password);
  }

  get hasUppercase(): boolean {
    return /[A-Z]/.test(this.password);
  }

  get hasSpecialChar(): boolean {
    return /[^A-Za-z0-9]/.test(this.password);
  }

  onRegister(): void {
    this.errorMessage = '';

    // 1. Validation: Full Name (Only alphabets and spaces)
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!this.fullName.trim() || !nameRegex.test(this.fullName)) {
      this.errorMessage = 'Full Name must contain only text/letters.';
      this.cdr.detectChanges();
      return;
    }

    // 2. Validation: Email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!this.email || !emailRegex.test(this.email)) {
      this.errorMessage = 'Please enter a valid email address (e.g., xxxxxxx@gmail.com).';
      this.cdr.detectChanges();
      return;
    }

    // 3. Validation: Password Rules
    if (!this.hasMinLength || !this.hasLowercase || !this.hasUppercase || !this.hasSpecialChar) {
      this.errorMessage = 'Password does not meet all security requirements.';
      this.cdr.detectChanges();
      return;
    }

    // 4. Validation: Confirm Password Match
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      this.cdr.detectChanges();
      return;
    }

    // 5. Validation: Indian Phone Number (10 digits, does not start with 0)
    const phoneRegex = /^[1-9][0-9]{9}$/;
    if (!this.phone || !phoneRegex.test(this.phone)) {
      this.errorMessage = 'Phone number must be exactly 10 digits and cannot start with 0.';
      this.cdr.detectChanges();
      return;
    }

    // 6. Validation: City (Only text/letters, spaces or commas)
    const cityRegex = /^[A-Za-z\s,]+$/;
    if (!this.city.trim() || !cityRegex.test(this.city)) {
      this.errorMessage = 'City must contain only text (e.g., City, State).';
      this.cdr.detectChanges();
      return;
    }

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

    this.http.post<any>('http://127.0.0.1:8000/api/auth/register', payload).subscribe({
      next: (res) => {
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
      
      if (this.countdownSeconds <= 0) {
        this.clearTimer();
        this.closeModalAndRedirect();
      }
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