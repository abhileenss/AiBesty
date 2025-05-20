import { promises as fs } from 'fs';
import path from 'path';
import fetch from 'node-fetch';

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
 * Updated according to the latest API documentation at https://elevenlabs.io/docs/api-reference/authentication
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
      // Updated Default voice IDs from ElevenLabs
      if (options.voice === 'female') {
        voiceId = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice
      } else if (options.voice === 'male') {
        voiceId = 'TxGEqnHWrfWFTfGW9XjX'; // Josh voice
      } else {
        // Default to female voice if not specified
        voiceId = '21m00Tcm4TlvDq8ikWAM';
      }
    }
    
    console.log(`Using ElevenLabs voice ID: ${voiceId}`);
    console.log(`API Key (redacted): ${ELEVENLABS_API_KEY.substring(0, 3)}...${ELEVENLABS_API_KEY.substring(ELEVENLABS_API_KEY.length - 3)}`);

    // Test API key validation with a simpler endpoint first
    try {
      const voicesResponse = await fetch('https://api.elevenlabs.io/v1/voices', {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (!voicesResponse.ok) {
        const error = await voicesResponse.text();
        console.error('ElevenLabs API key validation failed:', error);
        throw new Error(`API key validation failed: ${voicesResponse.status} ${error}`);
      }
      
      console.log('ElevenLabs API key validated successfully');
    } catch (apiKeyError) {
      console.error('Error validating ElevenLabs API key:', apiKeyError);
      throw new Error('Invalid or expired ElevenLabs API key');
    }

    // Now make the text-to-speech request
    console.log(`Making text-to-speech request to ElevenLabs for text: "${options.text.substring(0, 30)}..."`);
    
    const payload = {
      text: options.text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    };
    
    console.log('Request payload:', JSON.stringify(payload));

    // Make request to ElevenLabs API with updated endpoint
    const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    console.log('API URL:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      throw new Error(`ElevenLabs API returned ${response.status}: ${errorText}`);
    }

    // Get audio buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log('Received audio data size:', buffer.length, 'bytes');
    return buffer;
  } catch (error) {
    console.error('TTS error:', error);
    // Create a simple fallback audio buffer
    return createFallbackAudio();
  }
}

/**
 * Create a simple fallback audio in case the ElevenLabs API fails
 * This is a workaround for development/testing
 */
async function createFallbackAudio(): Promise<Buffer> {
  console.log('Generating fallback audio file...');
  try {
    // Check if we have a fallback audio file in assets
    const fallbackPath = path.join(process.cwd(), 'assets', 'fallback.mp3');
    try {
      return await fs.readFile(fallbackPath);
    } catch (fallbackError) {
      console.log('No fallback audio file found at:', fallbackPath);
      // Return an empty buffer as last resort
      return Buffer.from([]);
    }
  } catch (error) {
    console.error('Error creating fallback audio:', error);
    return Buffer.from([]);
  }
}
