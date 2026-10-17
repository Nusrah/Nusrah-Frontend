import { Component, ElementRef, HostListener, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ChatService, ChatTurn, ChatCampaign, ChatLink } from '../../../services/chat.service';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  campaigns?: ChatCampaign[];
  links?: ChatLink[];
  suggestions?: string[];
  isError?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.html',
  styleUrls: ['./chatbot.scss']
})
export class ChatbotComponent {
  @ViewChild('scrollArea') private scrollArea?: ElementRef<HTMLElement>;
  @ViewChild('inputBox') private inputBox?: ElementRef<HTMLInputElement>;

  // signals keep the window in sync even though the app runs without zone.js
  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly onDonatePage = signal(false); // lifts the launcher above the donate page's sticky bar on phones
  readonly lastMessageId = computed(() => {
    const all = this.messages();
    return all[all.length - 1]?.id ?? -1;
  });
  draft = '';
  readonly maxLength = 500;
  private nextId = 0;
  private scrollLocked = false;

  constructor(private chat: ChatService, private router: Router) {
    this.messages.set([this.welcomeMessage()]);
    this.onDonatePage.set(this.router.url.startsWith('/donate'));
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.onDonatePage.set(e.urlAfterRedirects.startsWith('/donate')));
    effect(() => {
      this.messages();
      this.isSending();
      this.isOpen();
      this.scrollToBottomSoon();
    });
  }

  private welcomeMessage(): ChatMessage {
    return {
      id: this.nextId++,
      role: 'assistant',
      text: 'Assalamu alaikum! I\'m the Nusrah assistant. I can help you find campaigns, explain how to donate or start a campaign, and take you to the right page. What would you like to do?',
      suggestions: ['Show Masjid campaigns', 'How do I donate?', 'How do I start a campaign?', 'Calculate my zakah']
    };
  }

  toggle(): void {
    this.isOpen.update(open => !open);
    this.setPhoneMode(this.isOpen());
    // only auto-focus on larger screens: on a phone it would pop the keyboard and hide the suggestions
    if (this.isOpen() && window.innerWidth >= 640) {
      setTimeout(() => this.inputBox?.nativeElement.focus(), 150);
    }
  }

  close(): void {
    this.isOpen.set(false);
    this.setPhoneMode(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) this.close();
  }

  // keeps the phone sheet the height of what is actually visible (so the keyboard never covers the input)
  private readonly syncViewport = (): void => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement.style;
    root.setProperty('--chat-vh', `${vv.height}px`);
    root.setProperty('--chat-top', `${vv.offsetTop}px`);
  };

  // phones: lock the page behind the full-screen chat and track the visible area; closing undoes it
  private setPhoneMode(open: boolean): void {
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    if (open && window.innerWidth < 640) {
      this.scrollLocked = true;
      document.body.style.overflow = 'hidden';
      this.syncViewport();
      vv?.addEventListener('resize', this.syncViewport);
      vv?.addEventListener('scroll', this.syncViewport);
    } else if (!open) {
      if (this.scrollLocked) document.body.style.overflow = '';
      this.scrollLocked = false;
      vv?.removeEventListener('resize', this.syncViewport);
      vv?.removeEventListener('scroll', this.syncViewport);
      root.removeProperty('--chat-vh');
      root.removeProperty('--chat-top');
    }
  }

  sendDraft(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.draft = '';
    this.send(text);
  }

  askSuggestion(text: string): void {
    this.send(text);
  }

  private send(text: string): void {
    if (this.isSending()) return;
    // recent conversation for the AI fallback (skips the welcome bubble and error bubbles)
    const history: ChatTurn[] = this.messages()
      .filter(m => m.id !== 0 && !m.isError)
      .map(m => ({ role: m.role, content: m.text }));
    this.messages.update(all => [...all, { id: this.nextId++, role: 'user', text }]);
    this.isSending.set(true);
    this.chat.send(text.slice(0, this.maxLength), history).subscribe({
      next: reply => {
        this.messages.update(all => [
          ...all,
          {
            id: this.nextId++,
            role: 'assistant',
            text: reply.reply,
            campaigns: reply.campaigns ?? [],
            links: reply.links ?? [],
            suggestions: reply.suggestions ?? []
          }
        ]);
        this.isSending.set(false);
      },
      error: err => {
        this.messages.update(all => [...all, { id: this.nextId++, role: 'assistant', text: this.chat.friendlyError(err), isError: true }]);
        this.isSending.set(false);
      }
    });
  }

  // opens a page the bot pointed to; on phones the chat covers the page, so it tucks away after navigating
  goTo(path: string): void {
    this.router.navigateByUrl(path);
    if (typeof window !== 'undefined' && window.innerWidth < 640) this.close();
  }

  clearChat(): void {
    this.nextId = 0;
    this.messages.set([this.welcomeMessage()]);
  }

  trackById(_index: number, message: ChatMessage): number {
    return message.id;
  }

  private scrollToBottomSoon(): void {
    setTimeout(() => {
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }, 0);
  }
}