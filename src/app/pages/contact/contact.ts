import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss']
})
export class ContactComponent {
  // Contact details (change here once, the whole page updates)
  readonly supportEmail = 'nusrah.support@gmail.com';
  readonly whatsappNumber = '919876543210'; // country code + number, digits only (no + or spaces)
  readonly whatsappDisplay = '+91 98765 43210';
  readonly instagramDisplay = '@nusrah.in';
  readonly instagramLink = 'https://www.instagram.com/nusrah.in/';

  name = '';
  email = '';
  message = '';
  errorMessage = '';
  submitted = false;
  copied = false;

  // Opens the user's default mail app with a ready-made mail addressed to support
  get mailtoLink(): string {
    const subject = `Message from ${this.name.trim() || 'a Nusrah visitor'}`;
    const body =
      `Assalamu Alaikum,\r\n\r\n${this.message.trim()}\r\n\r\n` +
      `Regards,\r\n${this.name.trim()}\r\nReply to: ${this.email.trim()}`;
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  // Opens WhatsApp directly to the support chat
  get whatsappLink(): string {
    const text = 'Assalamu Alaikum, I would like to get in touch with Nusrah.';
    return `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  onSubmit(): void {
    if (!this.name.trim()) { this.errorMessage = 'Please enter your name.'; return; }
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(this.email.trim())) {
      this.errorMessage = 'Please enter a valid email address.';
      return;
    }
    if (!this.message.trim()) { this.errorMessage = 'Please write your message.'; return; }

    this.errorMessage = '';
    this.submitted = true;
    this.openMailApp();
  }

  openMailApp(): void {
    window.location.href = this.mailtoLink;
  }

  async copyEmail(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.supportEmail);
      this.copied = true;
      setTimeout(() => (this.copied = false), 2000);
    } catch {
      this.copied = false;
    }
  }

  reset(): void {
    this.name = '';
    this.email = '';
    this.message = '';
    this.errorMessage = '';
    this.submitted = false;
  }
}