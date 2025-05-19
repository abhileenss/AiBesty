import { promises as fs } from 'fs';
import path from 'path';

/**
 * Interface for text-to-speech options
 */
interface TTSOptions {
  text: string;
  voice: string; // 'male' | 'female' | 'custom'
  mood?: string; // 'cheerful' | 'chill' | 'sassy' | 'romantic' | 'realist'
  voiceId?: string; // Custom voice ID if provided
}

/**
 * Convert text to speech using ElevenLabs API
 */
export async function textToSpeech(options: TTSOptions): Promise<Buffer> {
  try {
    // Check for API key
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY environment variable is not set');
    }
    
    console.log('Converting text to speech with ElevenLabs', {
      textLength: options.text.length,
      voice: options.voice,
      mood: options.mood
    });
    
    // Select voice ID based on voice type
    let voiceId = options.voiceId;
    if (!voiceId) {
      // Default voice IDs from ElevenLabs
      if (options.voice === 'female') {
        voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
      } else if (options.voice === 'male') {
        voiceId = 'TxGEqnHWrfWFTfGW9XjX'; // Josh voice
      } else {
        // Default to female voice if not specified
        voiceId = '21m00Tcm4TlvDq8ikWAM';
      }
    }

    // Make request to ElevenLabs API
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: options.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
    }

    // Get audio buffer
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error('TTS error:', error);
    throw new Error('Failed to convert text to speech');
  }
}
