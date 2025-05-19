import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AudioRecorder } from '@/lib/deepgram';
import { AudioPlayer, textToSpeech } from '@/lib/elevenlabs';
import { sendMessageToAI, getMoodPrompt } from '@/lib/openai';
import { speechToText } from '@/lib/deepgram';
import type { 
  Message, 
  Conversation, 
  Persona,
  VoiceType,
  MoodType
} from '@/lib/types';

interface UseConversationProps {
  userId?: number;
  initialPersona?: Persona;
}

export function useConversation({ userId, initialPersona }: UseConversationProps = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [persona, setPersona] = useState<Persona | null>(initialPersona || null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const audioRecorderRef = useRef<AudioRecorder>(new AudioRecorder());
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());
  const { toast } = useToast();
  
  // Fetch or create a conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      if (!userId || !persona) return;
      
      try {
        console.log("Initializing conversation with persona:", persona);
        
        // Try to get the most recent conversation
        const response = await fetch(`/api/conversations/recent`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && data.conversation) {
            console.log("Found existing conversation:", data.conversation);
            setConversation(data.conversation);
            setMessages(data.messages || []);
            return;
          }
        }
        
        // No existing conversation or it wasn't returned properly, create a new one
        console.log("Creating new conversation with persona ID:", persona.id);
        const newConversation = await createConversation(persona.id);
        
        if (newConversation) {
          console.log("Successfully created new conversation:", newConversation);
        } else {
          console.error("Failed to create conversation");
          setError("Failed to create conversation");
        }
      } catch (error) {
        console.error("Failed to initialize conversation:", error);
        setError("Failed to load conversation");
      }
    };
    
    initConversation();
  }, [userId, persona]);
  
  // Create a new conversation
  const createConversation = async (personaId?: number) => {
    if (!userId) {
      setError("User is not authenticated");
      return null;
    }
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personaId,
          title: "New Conversation"
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }
      
      const newConversation = await response.json();
      setConversation(newConversation);
      setMessages([]);
      return newConversation;
    } catch (error) {
      console.error("Create conversation error:", error);
      setError("Failed to create conversation");
      return null;
    }
  };
  
  // Update persona
  const updatePersona = async (voice: VoiceType, mood: MoodType, customVoiceId?: string) => {
    if (!userId) {
      setError("User is not authenticated");
      return null;
    }
    
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice,
          mood,
          customVoiceId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to update persona");
      }
      
      const newPersona = await response.json();
      setPersona(newPersona);
      return newPersona;
    } catch (error) {
      console.error("Update persona error:", error);
      setError("Failed to update persona");
      return null;
    }
  };
  
  // Toggle listening state
  const toggleListening = async () => {
    if (!conversation || !persona) {
      toast({
        title: "Cannot start conversation",
        description: "Please set up your persona first",
        variant: "destructive"
      });
      return;
    }
    
    if (isListening) {
      await stopListening();
    } else {
      await startListening();
    }
  };
  
  // Start listening for user input
  const startListening = async () => {
    try {
      // Pass a callback to receive live transcription updates
      await audioRecorderRef.current.start((text) => {
        setLiveTranscript(text); // Update the live transcript state
      });
      setIsListening(true);
      setLiveTranscript(''); // Clear any previous transcript
    } catch (error) {
      console.error("Start listening error:", error);
      toast({
        title: "Microphone error",
        description: error instanceof Error ? error.message : "Failed to access microphone",
        variant: "destructive"
      });
    }
  };
  
  // Stop listening and process audio
  const stopListening = async () => {
    if (!conversation || !persona) return;
    
    try {
      console.log("Stopping recording and processing voice input...");
      setIsListening(false);
      setIsProcessing(true);
      
      // Stop recording and get audio blob
      const audioBlob = await audioRecorderRef.current.stop();
      console.log("Audio recording stopped, blob size:", audioBlob.size);
      
      // Convert speech to text
      console.log("Sending audio for transcription...");
      const transcription = await speechToText({ audioBlob });
      
      if (!transcription.text.trim()) {
        setIsProcessing(false);
        toast({
          title: "Nothing detected",
          description: "I didn't catch that. Please try speaking again.",
          variant: "destructive"
        });
        return;
      }
      
      // Process the message
      await processMessage(transcription.text);
    } catch (error) {
      console.error("Stop listening error:", error);
      setIsProcessing(false);
      setError("Failed to process audio");
      toast({
        title: "Processing error",
        description: error instanceof Error ? error.message : "Failed to process your message",
        variant: "destructive"
      });
    }
  };
  
  // Process a text message
  const processMessage = async (text: string) => {
    if (!conversation || !persona) return;
    
    try {
      setIsProcessing(true);
      
      // Save user message
      const userMessage: Partial<Message> = {
        conversationId: conversation.id,
        content: text,
        isUserMessage: true
      };
      
      const saveUserMessageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage),
        credentials: 'include'
      });
      
      if (!saveUserMessageResponse.ok) {
        throw new Error("Failed to save user message");
      }
      
      const savedUserMessage = await saveUserMessageResponse.json();
      setMessages(prev => [...prev, savedUserMessage]);
      
      // Get AI response
      setIsResponding(true);
      const aiResponse = await sendMessageToAI(text, conversation.id, persona.mood);
      
      // Save AI message
      const aiMessage: Partial<Message> = {
        conversationId: conversation.id,
        content: aiResponse.text,
        isUserMessage: false
      };
      
      const saveAiMessageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiMessage),
        credentials: 'include'
      });
      
      if (!saveAiMessageResponse.ok) {
        throw new Error("Failed to save AI message");
      }
      
      const savedAiMessage = await saveAiMessageResponse.json();
      setMessages(prev => [...prev, savedAiMessage]);
      
      // Convert AI response to speech
      const speechResponse = await textToSpeech({
        text: aiResponse.text,
        voice: persona.voice,
        mood: persona.mood,
        voiceId: persona.customVoiceId
      });
      
      // Play the audio response
      await audioPlayerRef.current.play(speechResponse.audioUrl);
    } catch (error) {
      console.error("Process message error:", error);
      setError("Failed to process message");
      toast({
        title: "Conversation error",
        description: error instanceof Error ? error.message : "Failed to get a response",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setIsResponding(false);
    }
  };
  
  // Get messages for the current conversation
  const fetchMessages = useCallback(async () => {
    if (!conversation) return;
    
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/messages`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      
      const fetchedMessages = await response.json();
      setMessages(fetchedMessages);
    } catch (error) {
      console.error("Fetch messages error:", error);
      setError("Failed to load messages");
    }
  }, [conversation]);
  
  return {
    messages,
    conversation,
    persona,
    isListening,
    isProcessing,
    isResponding,
    error,
    toggleListening,
    processMessage,
    updatePersona,
    createConversation,
    fetchMessages,
    clearError: () => setError(null)
  };
}
