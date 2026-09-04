export type ReflectionMode = 'reflect' | 'summarize' | 'brainstorm' | 'action_items';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  starred?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ReflectionRequestPayload {
  prompt: string;
  mode?: ReflectionMode;
  history?: Array<{
    role: 'user' | 'model';
    content: string;
  }>;
}

export interface ReflectionResponsePayload {
  response: string;
  suggestedTitle?: string;
  suggestedSummary?: string;
  followUpQuestions?: string[];
  modelUsed: string;
}
