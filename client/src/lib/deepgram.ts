import { blobToBase64 } from "./utils";
import type { SpeechToTextRequest, SpeechToTextResponse } from "./types";

/**
 * Convert speech to text using Deepgram API
 */
export async function speechToText(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
  try {
    console.log("Starting speech-to-text conversion...");
    console.log("Audio blob size:", request.audioBlob.size);
    
    // Convert audio blob to base64
    const base64Audio = await blobToBase64(request.audioBlob);
    console.log("Converted audio to base64, length:", base64Audio.length);
    
    // Send to backend
    console.log("Sending audio to server for transcription...");
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
      console.error("Speech-to-text API error:", error);
      throw new Error(`Speech to text failed: ${error}`);
    }
    
    const result = await response.json();
    console.log("Transcription result:", result);
    return result;
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
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: 16000 // Lower sample rate for smaller file size
        } 
      });
      
      // Create media recorder with options for smaller file size
      const options = { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000 // Lower bitrate for smaller file size
      };
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];
      
      // Set up event listeners and capture audio in smaller chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };
      
      // Start recording with small timeslice to get chunks more frequently
      this.mediaRecorder.start(100); // Get data every 100ms
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
      
      this.mediaRecorder.onstop = async () => {
        try {
          // Create a single blob from all audio chunks with compressed format
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
          
          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          
          // For very large files, we can return a smaller segment
          if (audioBlob.size > 500000) { // If > 500KB
            console.log("Audio too large, using first 5 seconds only");
            resolve(this.audioChunks[0]); // Use just the first chunk
          } else {
            resolve(audioBlob);
          }
        } catch (error) {
          console.error("Error processing audio:", error);
          reject(error);
        }
      };
      
      this.mediaRecorder.stop();
    });
  }
  
  isRecording(): boolean {
    return this.mediaRecorder !== null && this.mediaRecorder.state === 'recording';
  }
}
