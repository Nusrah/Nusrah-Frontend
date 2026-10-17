import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

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

export interface ChatLink {
  label: string;
  path: string;
}

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

  // sends the message plus recent history (for AI context) to the backend
  send(message: string, history: ChatTurn[]): Observable<ChatReply> {
    return this.http.post<ChatReply>('/api/chat', {
      message,
      history: history.slice(-this.MAX_HISTORY_TURNS)
    });
  }

  // turns an HTTP error into a short, friendly message for the chat window
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