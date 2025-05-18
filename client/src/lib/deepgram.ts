import { blobToBase64 } from "./utils";
import type { SpeechToTextRequest, SpeechToTextResponse } from "./types";

/**
 * Convert speech to text using Deepgram API
 */
export async function speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
  try {
    // Convert audio blob to base64
    const base64Audio = await blobToBase64(request.audioBlob);
    
    // Send to backend
    const response = await fetch('/api/speech-to-text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ audio: base64Audio }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Speech to text failed: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Speech to text error:", error);
    throw error;
  }
}

/**
 * Record audio from the microphone
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  
  async start(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];
      
      // Set up event listeners
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording
      this.mediaRecorder.start();
    } catch (error) {
      console.error("Failed to start recording:", error);
      throw new Error("Microphone access denied or not available");
    }
  }
  
  stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("Recording has not started"));
        return;
      }
      
      this.mediaRecorder.onstop = () => {
        // Create a single blob from all audio chunks
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        
        // Clean up
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }
        
        resolve(audioBlob);
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}
