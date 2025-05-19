// User-related types
export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

// Auth-related types
export interface AuthRequest {
  email: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string; // For development testing only
  user?: User;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface VerifyTokenResponse {
  success: boolean;
  user?: User;
}

// Persona-related types
export type VoiceType = 'male' | 'female' | 'custom';
export type MoodType = 'cheerful' | 'chill' | 'sassy' | 'romantic' | 'realist' | 'custom';

export interface Persona {
  id: number;
  userId: number;
  voice: VoiceType;
  mood: MoodType;
  customVoiceId?: string;
  customMoodSettings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePersonaRequest {
  voice: VoiceType;
  mood: MoodType;
  customVoiceId?: string;
  customMoodSettings?: Record<string, any>;
}

// Conversation-related types
export interface Conversation {
  id: number;
  userId: number;
  personaId?: number;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateConversationRequest {
  personaId?: number;
  title?: string;
}

// Message-related types
export interface Message {
  id: number;
  conversationId: number;
  content: string;
  audioUrl?: string;
  isUserMessage: boolean;
  createdAt: Date;
}

export interface SendMessageRequest {
  conversationId: number;
  content: string;
  audioBlob?: Blob;
}

export interface SendMessageResponse {
  message: Message;
  aiResponse: Message;
  audioUrl: string;
}

// Speech processing types
export interface SpeechToTextRequest {
  audioBlob: Blob;
}

export interface SpeechToTextResponse {
  text: string;
  confidence: number;
}

export interface TextToSpeechRequest {
  text: string;
  voice: VoiceType;
  mood?: MoodType;
  voiceId?: string;
}

export interface TextToSpeechResponse {
  audioUrl: string;
}

// View management state
export type AppView = 'auth' | 'verification' | 'persona' | 'conversation';

// WebSocket message types
export interface WebSocketMessage {
  type: 'transcript' | 'aiResponse' | 'error';
  data: any;
}
