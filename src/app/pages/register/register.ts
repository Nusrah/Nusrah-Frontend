import { Component, OnDestroy, ChangeDetectorRef, HostListener } from '@angular/core';
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
  showPassword = false;
  showRegisterModal = false;
  showSuccessModal = false;
  countdownSeconds = 10;
  private timerInterval: any = null;

  // Verses (Arabic text + meaning) shown in the "Words of Allah on Giving" section
  verses = [
    {
      ref: 'Surah Al-Baqarah 2:261',
      theme: 'Multiplied Reward',
      arabic: 'مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ ۗ وَاللَّهُ يُضَاعِفُ لِمَن يَشَاءُ',
      meaning: 'The example of those who spend their wealth in the way of Allah is like a grain that grows seven ears, with a hundred grains in every ear. And Allah multiplies the reward for whom He wills.',
      note: ''
    },
    {
      ref: 'Surah Aal-Imran 3:92',
      theme: 'True Righteousness',
      arabic: 'لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ ۚ وَمَا تُنفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ',
      meaning: 'You will never attain true righteousness until you spend from what you love. And whatever you spend, Allah knows it well.',
      note: ''
    },
    {
      ref: 'Surah Aal-Imran 3:133-134',
      theme: 'The Path to Jannah',
      arabic: 'وَسَارِعُوا إِلَىٰ مَغْفِرَةٍ مِّن رَّبِّكُمْ وَجَنَّةٍ عَرْضُهَا السَّمَاوَاتُ وَالْأَرْضُ أُعِدَّتْ لِلْمُتَّقِينَ ۝ الَّذِينَ يُنفِقُونَ فِي السَّرَّاءِ وَالضَّرَّاءِ',
      meaning: 'Hasten towards forgiveness from your Lord and a Garden as vast as the heavens and the earth, prepared for the righteous, those who spend in times of ease and in times of hardship.',
      note: ''
    },
    {
      ref: 'Surah Al-Insan 76:8-9',
      theme: 'Giving For Allah Alone',
      arabic: 'وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَأَسِيرًا ۝ إِنَّمَا نُطْعِمُكُمْ لِوَجْهِ اللَّهِ لَا نُرِيدُ مِنكُمْ جَزَاءً وَلَا شُكُورًا',
      meaning: 'They feed the poor, the orphan and the captive, though they love the food themselves, saying: "We feed you only for the sake of Allah. We want no reward or thanks from you."',
      note: 'Allah then promises them a Garden for their patience (76:12).'
    }
  ];

  roles = [
    {
      icon: '📋',
      title: 'Roles & Responsibilities',
      text: 'Your primary mission is ensuring complete transparency and trust across campaigns.',
      points: [
        'Verify genuine campaign needs and project details on the ground.',
        'Monitor fund utilization and make sure contributions reach the rightful recipients.',
        'Maintain transparent documentation to build absolute donor confidence.'
      ]
    },
    {
      icon: '🕌',
      title: 'Local Masjid Assignment',
      text: 'Community work starts locally. Admins assign each volunteer to their nearest masjid or one of their preference.',
      points: [
        'Coordinate directly with local mosque committees for community welfare.',
        'Seamlessly oversee local community campaigns near your neighborhood.',
        'Foster local unity and charitable engagement close to home.'
      ]
    },
    {
      icon: '📊',
      title: 'Ground Work & Digital Updates',
      text: 'An exclusive volunteer portal lets you document field findings and keep donors updated in real time.',
      points: [
        'Perform on-site checks on progress, funds, and active requirements.',
        'Upload photos, reports, and progress updates from the volunteer dashboard.',
        'Keep donors informed with genuine visual proof and transparent milestones.'
      ]
    }
  ];

  steps = [
    { title: 'Submit Your Details', text: 'Fill out the registration form with your accurate personal and contact information.' },
    { title: 'Admin Review & Approval', text: 'The platform admin reviews and approves your registration. Once approved, you can log in with your credentials.' },
    { title: 'Assignment & Field Updates', text: 'You are assigned to a campaign near your masjid. Conduct ground work, verify progress, and upload photo updates.' }
  ];

  // Mobile-only dropdown cards (verses 'v0', roles 'r0', steps 's0'...). Collapsed by default,
  // each opens independently. From the `sm` breakpoint up every card is always shown.
  private openCards = new Set<string>();

  toggleCard(key: string): void {
    if (this.openCards.has(key)) this.openCards.delete(key);
    else this.openCards.add(key);
  }

  isCardOpen(key: string): boolean {
    return this.openCards.has(key);
  }

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.clearTimer();
    this.setScrollLock(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showRegisterModal) this.closeRegisterModal();
  }

  openRegisterModal(): void {
    this.errorMessage = '';
    this.showRegisterModal = true;
    this.setScrollLock(true);
  }

  closeRegisterModal(): void {
    this.showRegisterModal = false;
    this.setScrollLock(false);
  }

  private setScrollLock(lock: boolean): void {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  get hasMinLength(): boolean { return this.password.length >= 8; }
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
        this.showRegisterModal = false; // scroll stays locked while the success modal is open
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
    this.setScrollLock(false);
    this.cdr.detectChanges();
    this.router.navigate(['/login'], { state: { registered: true } });
  }
}