/**
 * Transcribe audio using Deepgram API
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
    
    // Make API request to Deepgram
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
      console.error(`Deepgram API error: ${response.status} ${errorText}`);
      throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    const resultData = result as any;
    
    // Extract transcript and confidence
    const transcript = resultData.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
    const confidence = resultData.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
    
    console.log(`Transcription: "${transcript}" (confidence: ${confidence})`);
    return { text: transcript, confidence };
  } catch (error) {
    console.error('Speech-to-text processing error:', error);
    throw new Error('Failed to transcribe audio');
  }
}
