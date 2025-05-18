import fetch from 'node-fetch';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'dummy_key_for_dev';
const API_BASE_URL = 'https://api.elevenlabs.io/v1';

// Voice IDs for default voices
const VOICE_IDS = {
  male: {
    cheerful: 'ErXwobaYiN019PkySvjV', // Antoni
    chill: 'VR6AewLTigWG4xSOukaG', // Liam
    sassy: 'TX3LPaxmHKxFdv7VOQHJ', // Thomas
    romantic: 'ODq5zmih8GrVes37Dizd', // Patrick
    realist: 'SOYHLrjzK2X1ezoPC6cr', // Harry
  },
  female: {
    cheerful: 'jBpfuIE2acCO8z3wKNLl', // Bella
    chill: 'XB0fDUnXU5powFXDhCwa', // Charlotte
    sassy: 'JKQKeZ7AxrUJ4JoYDXlu', // Dorothy
    romantic: 'pNInz6obpgDQGcFmaJgB', // Alice
    realist: 'je6Q42maT2eedH6HCYTb', // Grace
  }
};

// Stability settings for different moods
const MOOD_STABILITY = {
  cheerful: 0.3,
  chill: 0.6,
  sassy: 0.35,
  romantic: 0.5,
  realist: 0.75
};

// Similarity settings for different moods
const MOOD_SIMILARITY = {
  cheerful: 0.8,
  chill: 0.6,
  sassy: 0.7,
  romantic: 0.75,
  realist: 0.65
};

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
    const { text, voice, mood = 'chill', voiceId } = options;
    
    // Determine which voice ID to use
    const selectedVoiceId = voiceId || 
      (voice === 'male' 
        ? VOICE_IDS.male[mood as keyof typeof VOICE_IDS.male] || VOICE_IDS.male.chill
        : VOICE_IDS.female[mood as keyof typeof VOICE_IDS.female] || VOICE_IDS.female.chill);
    
    // Set stability and similarity based on mood
    const stability = MOOD_STABILITY[mood as keyof typeof MOOD_STABILITY] || 0.5;
    const similarity = MOOD_SIMILARITY[mood as keyof typeof MOOD_SIMILARITY] || 0.7;
    
    // Prepare request to ElevenLabs API
    const url = `${API_BASE_URL}/text-to-speech/${selectedVoiceId}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability,
          similarity_boost: similarity,
        },
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error: ${response.status} ${errorText}`);
    }
    
    // Get audio data
    const audioBuffer = await response.arrayBuffer();
    return Buffer.from(audioBuffer);
  } catch (error) {
    console.error('ElevenLabs API error:', error);
    throw new Error('Failed to convert text to speech');
  }
}
