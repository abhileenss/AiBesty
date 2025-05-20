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
  private liveTranscriptionCallback: ((text: string) => void) | null = null;
  private transcriptionInterval: number | null = null;
  
  async start(onLiveTranscription?: (text: string) => void): Promise<void> {
    try {
      this.liveTranscriptionCallback = onLiveTranscription || null;
      
      console.log("Requesting microphone access...");
      
      // Request microphone access with more compatible settings
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1
        } 
      });
      
      console.log("Microphone access granted, setting up recorder...");
      
      // Find a supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus', 
        'audio/mp4',
        ''  // Empty string lets browser pick best format
      ];
      
      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (mimeType === '' || MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      console.log(`Using MIME type: ${selectedMimeType || 'browser default'}`);
      
      // Create media recorder with more compatible options
      const options: MediaRecorderOptions = {};
      if (selectedMimeType) {
        options.mimeType = selectedMimeType;
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.audioChunks = [];
      
      // Set up event listeners and capture audio in chunks
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`Audio chunk captured: ${event.data.size} bytes`);
        }
      };
      
      // Start recording with small timeslice to get chunks
      this.mediaRecorder.start(500); // Get data every 500ms
      console.log("Recording started...");
      
      // Set up live transcription if callback provided
      if (this.liveTranscriptionCallback) {
        console.log("Setting up live transcription...");
        // Every 2 seconds, send the current audio for real-time transcription
        this.transcriptionInterval = window.setInterval(async () => {
          if (this.audioChunks.length > 0) {
            try {
              // Create a blob from current chunks for interim transcription
              const currentAudio = new Blob(this.audioChunks, { type: selectedMimeType || 'audio/webm' });
              
              // Don't send if too small
              if (currentAudio.size < 1000) {
                console.log("Audio chunk too small, skipping live transcription");
                return;
              }
              
              console.log(`Sending ${currentAudio.size} bytes for live transcription`);
              
              // Convert to base64 and send for transcription
              const base64Audio = await blobToBase64(currentAudio);
              const response = await fetch('/api/speech-to-text', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ audio: base64Audio }),
                credentials: 'include'
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log("Live transcription result:", result);
                if (result.text && this.liveTranscriptionCallback) {
                  this.liveTranscriptionCallback(result.text);
                }
              } else {
                console.error("Live transcription API error:", await response.text());
              }
            } catch (error) {
              console.log("Live transcription error (non-fatal):", error);
            }
          }
        }, 2000); // Update every 2 seconds
      }
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
      
      console.log("Stopping recording...");
      
      // Clean up live transcription interval if it exists
      if (this.transcriptionInterval) {
        window.clearInterval(this.transcriptionInterval);
        this.transcriptionInterval = null;
      }
      
      this.mediaRecorder.onstop = async () => {
        try {
          console.log(`Captured ${this.audioChunks.length} audio chunks`);
          
          // Create a single blob from all audio chunks
          const audioBlob = new Blob(this.audioChunks, { 
            type: this.mediaRecorder?.mimeType || 'audio/webm' 
          });
          
          console.log(`Final audio size: ${audioBlob.size} bytes`);
          
          // Clean up
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          
          resolve(audioBlob);
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
