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
    
    // Try to detect if the input is a different format
    let contentType = 'audio/webm';
    
    // Check for common audio format headers
    const header = audioBase64.substring(0, 50);
    if (header.includes('RIFF') || header.includes('WAV')) {
      contentType = 'audio/wav';
    } else if (header.includes('OggS')) {
      contentType = 'audio/ogg';
    } else if (header.includes('fLaC')) {
      contentType = 'audio/flac';
    } else if (header.includes('ID3') || header.includes('MPEG')) {
      contentType = 'audio/mp3';
    }
    
    console.log(`Using content type: ${contentType}`);
    
    // Make direct API request to Deepgram with more robust error handling
    try {
      const response = await fetch('https://api.deepgram.com/v1/listen?smart_format=true&model=nova-2', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': contentType,
        },
        body: audioBinary
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Deepgram API error: ${response.status} ${errorText}`);
        throw new Error(`Deepgram API error: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Deepgram result:', JSON.stringify(result).substring(0, 200) + '...');
      
      // Extract transcript and confidence with proper type handling
      const resultObj = result as any;
      const transcript = resultObj.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
      const confidence = resultObj.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0;
      
      console.log(`Transcription: "${transcript}" (confidence: ${confidence})`);
      return { text: transcript, confidence };
    } catch (deepgramError) {
      console.error('Primary Deepgram error:', deepgramError);
      
      // Fall back to OpenAI Whisper as an alternative
      console.log('Attempting to use OpenAI Whisper as fallback...');
      
      // Import OpenAI dynamically to avoid circular dependencies
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Create a temporary file to use with the OpenAI API
      const fs = require('fs/promises');
      const path = require('path');
      const fileName = `audio_${Date.now()}.webm`;
      const tempFilePath = path.join('/tmp', fileName);
      
      try {
        // Write the audio to a temporary file
        await fs.writeFile(tempFilePath, audioBinary);
        
        // Create a File object from the temp file that OpenAI API requires
        const fsOrig = require('fs');
        const file = fsOrig.createReadStream(tempFilePath);
        
        // Make the API call to OpenAI Whisper
        console.log('Sending audio to OpenAI Whisper API...');
        const transcription = await openai.audio.transcriptions.create({
          file,
          model: 'whisper-1',
        });
        
        // Clean up the temporary file
        await fs.unlink(tempFilePath).catch(err => console.log('Error deleting temp file:', err));
        
        console.log('OpenAI Whisper result:', transcription);
        return { text: transcription.text, confidence: 0.9 }; // Whisper doesn't return confidence, use a fixed value
      } catch (whisperError) {
        console.error('OpenAI Whisper fallback error:', whisperError);
        throw new Error('Both Deepgram and OpenAI fallback failed to transcribe audio');
      }
    }
  } catch (error) {
    console.error('Speech-to-text processing error:', error);
    throw new Error('Failed to transcribe audio: ' + (error.message || 'Unknown error'));
  }
}
