import React, { useState } from 'react';
import { Button } from './ui/button';
import { textToSpeech } from '@/lib/elevenlabs';
import { useToast } from '@/hooks/use-toast';

export function TestVoiceButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const testVoiceOutput = async () => {
    setIsLoading(true);
    try {
      // Simple test message
      const testMessage = "Hello! This is a test of the ElevenLabs voice synthesis. Can you hear me clearly? I'm your AI Besty!";
      
      console.log("Sending test request to text-to-speech API...");
      const response = await textToSpeech({
        text: testMessage,
        voice: 'female',
        mood: 'cheerful'
      });
      
      console.log("Response from text-to-speech API:", response);
      
      if (response && response.audioUrl) {
        // Create audio element and play
        const audio = new Audio();
        audio.src = response.audioUrl;
        audio.volume = 1.0;
        
        // Log events to diagnose issues
        audio.addEventListener('canplaythrough', () => console.log('Audio loaded and can play'));
        audio.addEventListener('playing', () => console.log('Audio started playing'));
        audio.addEventListener('error', (e) => console.error('Audio error:', e));
        
        console.log("Playing audio from URL:", response.audioUrl);
        await audio.play();
        
        toast({
          title: "Voice test successful!",
          description: "If you heard audio, the voice system is working correctly.",
        });
      } else {
        throw new Error("No audio URL received");
      }
    } catch (error) {
      console.error("Voice test failed:", error);
      toast({
        title: "Voice test failed",
        description: "Could not play the test audio. See console for details.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button
      onClick={testVoiceOutput}
      disabled={isLoading}
      variant="outline"
      className="mt-4"
    >
      {isLoading ? "Testing..." : "Test Voice Output"}
    </Button>
  );
}