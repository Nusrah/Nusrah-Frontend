import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

// Same backend address the rest of the app uses. Change this one line when you deploy the backend.
const API_BASE = 'http://127.0.0.1:8000';

// One message in the conversation (what the backend receives as "history")
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// A campaign card the bot can show in the chat (public fields only)
export interface ChatCampaign {
  id: string;
  title: string;
  location: string;
  category: string;
  goal: number;
  raised: number;
  progress: number;
  image_url?: string | null;
  end_date?: string | null;
  path: string; // e.g. /donate/<id>
}

// A button/link the bot suggests, e.g. { label: 'Browse campaigns', path: '/campaigns' }
export interface ChatLink {
  label: string;
  path: string;
}

// What the backend sends back for every message
export interface ChatReply {
  reply: string;
  campaigns: ChatCampaign[];
  links: ChatLink[];
  suggestions: string[];
  source: 'rules' | 'ai' | 'default';
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly MAX_HISTORY_TURNS = 8;

  constructor(private http: HttpClient) {}

  // Sends the visitor's message (plus recent history, so the AI fallback has context) to the backend
  send(message: string, history: ChatTurn[]): Observable<ChatReply> {
    return this.http.post<ChatReply>(`${API_BASE}/api/chat`, {
      message,
      history: history.slice(-this.MAX_HISTORY_TURNS)
    });
  }

  // Turns an HTTP error into a short, friendly message for the chat window
  friendlyError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 429) {
        return 'You are sending messages very quickly. Please wait a moment and try again.';
      }
      if (err.status === 422) {
        return 'That message is too long. Please keep it under 500 characters.';
      }
      if (err.status === 0) {
        return 'I cannot reach the server right now. Please check your connection and try again.';
      }
    }
    return 'Sorry, something went wrong on my side. Please try again in a moment.';
  }
}