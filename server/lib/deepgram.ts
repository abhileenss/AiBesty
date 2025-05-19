/**
 * Transcribe audio using Deepgram API with a direct HTTP request
 * instead of using the SDK to avoid version compatibility issues
 */
import fetch from 'node-fetch';

export async function transcribeAudio(audioBase64: string): Promise<{ text: string, confidence: number }> {
  try {
    // Check for API key
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (!deepgramApiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }
    
    console.log('Audio data received, processing speech-to-text...');
    console.log('Audio data size:', audioBase64.length);
    
    // Convert base64 to buffer
    const audioBinary = Buffer.from(audioBase64, 'base64');
    
    // Make direct API request to Deepgram
    const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${deepgramApiKey}`,
        'Content-Type': 'audio/webm',
      },
      body: audioBinary
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    
    // Extract transcript and confidence
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = result.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
    
    return { text: transcript, confidence };
  } catch (error) {
    console.error('Deepgram API error:', error);
    throw new Error('Failed to transcribe audio');
  }
}
