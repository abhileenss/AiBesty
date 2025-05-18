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
      this.isPlaying = false;
    });
    
    this.audioElement.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      this.isPlaying = false;
    });
  }
  
  async play(audioUrl: string): Promise<void> {
    try {
      // Stop any currently playing audio
      await this.stop();
      
      if (!this.audioElement) {
        this.audioElement = new Audio();
      }
      
      // Set up new audio
      this.audioElement.src = audioUrl;
      this.audioElement.volume = 1.0;
      
      // Play audio
      await this.audioElement.play();
      this.isPlaying = true;
    } catch (error) {
      console.error("Failed to play audio:", error);
      throw error;
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
