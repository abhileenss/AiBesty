import type { TextToSpeechRequest, TextToSpeechResponse } from "./types";

/**
 * Convert text to speech using ElevenLabs API
 */
export async function textToSpeech(request: TextToSpeechRequest): Promise<TextToSpeechResponse> {
  try {
    const response = await fetch('/api/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: request.text,
        voice: request.voice,
        mood: request.mood,
        voiceId: request.voiceId
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Text to speech failed: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Text to speech error:", error);
    throw error;
  }
}

/**
 * Play audio from URL with crossfading
 */
export class AudioPlayer {
  private audioElement: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  
  constructor() {
    this.audioElement = new Audio();
    
    this.audioElement.addEventListener('ended', () => {
      console.log('Audio playback completed');
      this.isPlaying = false;
    });
    
    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      this.isPlaying = false;
    });
    
    this.audioElement.addEventListener('canplaythrough', () => {
      console.log('Audio ready to play without buffering');
    });
    
    this.audioElement.addEventListener('playing', () => {
      console.log('Audio is now playing');
    });
  }
  
  async play(audioUrl: string): Promise<void> {
    try {
      console.log(`Attempting to play audio from URL: ${audioUrl}`);
      
      // Stop any currently playing audio
      await this.stop();
      
      if (!this.audioElement) {
        this.audioElement = new Audio();
      }
      
      // Add a timestamp to prevent caching issues
      const urlWithTimestamp = `${audioUrl}?t=${Date.now()}`;
      console.log(`Using URL with cache busting: ${urlWithTimestamp}`);
      
      // Set up new audio
      this.audioElement.src = urlWithTimestamp;
      this.audioElement.volume = 1.0;
      
      // Preload the audio
      this.audioElement.preload = 'auto';
      
      // Play audio with retry mechanism
      try {
        console.log('Starting audio playback...');
        await this.audioElement.play();
        this.isPlaying = true;
        console.log('Audio playback started successfully');
      } catch (playError) {
        console.error('Initial playback failed, retrying...', playError);
        
        // Wait a moment and retry
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Retrying audio playback...');
        await this.audioElement.play();
        this.isPlaying = true;
        console.log('Audio playback started on retry');
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      
      // Create and play a notification sound as fallback
      try {
        const fallbackAudio = new Audio();
        fallbackAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        await fallbackAudio.play();
      } catch (fallbackError) {
        console.error("Even fallback audio failed:", fallbackError);
      }
    }
  }
  
  async stop(): Promise<void> {
    if (this.audioElement && this.isPlaying) {
      this.audioElement.pause();
      this.audioElement.currentTime = 0;
      this.isPlaying = false;
    }
  }
  
  setVolume(volume: number): void {
    if (this.audioElement) {
      this.audioElement.volume = Math.max(0, Math.min(1, volume));
    }
  }
  
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}
