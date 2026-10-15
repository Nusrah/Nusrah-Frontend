import { Component, ElementRef, HostListener, ViewChild, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ChatService, ChatTurn, ChatCampaign, ChatLink } from '../../../services/chat.service';

// One bubble in the chat window
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

  // Signals keep the window in sync even though the app runs without zone.js
  readonly isOpen = signal(false);
  readonly isSending = signal(false);
  readonly messages = signal<ChatMessage[]>([]);

  // Only the newest bot message shows its quick-reply suggestions, to avoid clutter
  readonly lastMessageId = computed(() => {
    const all = this.messages();
    return all[all.length - 1]?.id ?? -1;
  });

  draft = '';
  readonly maxLength = 500;
  private nextId = 0;

  constructor(
    private chat: ChatService,
    private router: Router
  ) {
    this.messages.set([this.welcomeMessage()]);

    // Whenever something changes, keep the newest message in view
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
    if (this.isOpen()) {
      setTimeout(() => this.inputBox?.nativeElement.focus(), 150);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen()) {
      this.close();
    }
  }

  // "Enter" in the box or the send button
  sendDraft(): void {
    const text = this.draft.trim();
    if (!text) {
      return;
    }
    this.draft = '';
    this.send(text);
  }

  // A tapped suggestion chip behaves like the visitor typed it
  askSuggestion(text: string): void {
    this.send(text);
  }

  private send(text: string): void {
    if (this.isSending()) {
      return;
    }

    // Recent conversation for the AI fallback (skip the welcome bubble and error bubbles)
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
        this.messages.update(all => [
          ...all,
          { id: this.nextId++, role: 'assistant', text: this.chat.friendlyError(err), isError: true }
        ]);
        this.isSending.set(false);
      }
    });
  }

  // Opens a page the bot pointed to (a campaign's donate page, /campaigns, /register ...)
  goTo(path: string): void {
    this.router.navigateByUrl(path);
    // On phones the chat covers the page, so tuck it away after navigating
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      this.close();
    }
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
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }, 0);
  }
}