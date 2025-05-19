import { useState, useEffect, useRef } from 'react';
import { CircleButton } from '@/components/ui/circle-button';
import { AudioWave } from '@/components/ui/audio-wave';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, FileText, RefreshCw, UserCog, Send } from 'lucide-react';
import { useConversation } from '@/hooks/use-conversation';
import { TranscriptModal } from '@/components/TranscriptModal';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Persona } from '@/lib/types';

interface ConversationViewProps {
  userId: number;
  persona: Persona;
  onChangePersona: () => void;
}

export function ConversationView({ userId, persona, onChangePersona }: ConversationViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textMessage, setTextMessage] = useState('');
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const { toast } = useToast();
  
  const { 
    messages,
    conversation,
    isListening,
    isProcessing,
    isResponding,
    toggleListening,
    createConversation
  } = useConversation({ userId, initialPersona: persona });
  
  const getStatusText = () => {
    if (isProcessing) return "Processing...";
    if (isResponding) return "Besty is responding...";
    if (isListening) return "I'm listening...";
    return showTextInput ? "Type a message to Besty..." : "Tap the circle to start talking";
  };
  
  const handleRestartConversation = async () => {
    await createConversation(persona.id);
  };
  
  // Handle sending a message and generating AI response
  const handleMessage = async (messageContent: string) => {
    if (!messageContent.trim() || !conversation) return;
    
    try {
      // Create the user message
      const userMessage = {
        conversationId: conversation.id,
        content: messageContent.trim(),
        isUserMessage: true
      };
      
      // Save user message
      const saveUserMessageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userMessage),
        credentials: 'include'
      });
      
      if (!saveUserMessageResponse.ok) {
        throw new Error("Failed to save user message");
      }
      
      toast({
        title: "Message sent",
        description: "Waiting for Besty's response...",
      });
      
      // Generate a contextual response
      console.log("Generating AI Besty response...");
      
      // Create AI message with contextual response based on the user's input
      let aiResponse = "Hi! I'm your AI Besty. I can hear you and I'm here to chat about anything you'd like.";
      
      // Add some simple contextual responses based on keywords
      const lowerContent = messageContent.toLowerCase();
      if (lowerContent.includes("hello") || lowerContent.includes("hi ")) {
        aiResponse = "Hello! I'm your AI Besty. It's nice to chat with you today! What's on your mind?";
      } else if (lowerContent.includes("how are you")) {
        aiResponse = "I'm doing well, thanks for asking! I'm here to listen and chat. How are YOU feeling today?";
      } else if (lowerContent.includes("help")) {
        aiResponse = "I'm here to help! You can talk to me about your day, your feelings, or anything else that's on your mind.";
      } else if (lowerContent.includes("sucks") || lowerContent.includes("bad") || lowerContent.includes("sad")) {
        aiResponse = "I'm sorry to hear that things aren't going well. Would you like to tell me more about what's bothering you? Sometimes talking about it can help.";
      } else if (lowerContent.includes("listen")) {
        aiResponse = "Yes, I can hear you! I'm listening to everything you say. Feel free to share what's on your mind.";
      }
      
      // Create AI response in database
      const aiMessageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversation.id,
          content: aiResponse,
          isUserMessage: false
        }),
        credentials: 'include'
      });
      
      if (aiMessageResponse.ok) {
        // Get updated messages
        const messagesResponse = await fetch(`/api/conversations/${conversation.id}/messages`, {
          credentials: 'include'
        });
        
        if (messagesResponse.ok) {
          await messagesResponse.json();
          toast({
            title: "Besty replied",
            description: "Check out Besty's response!",
          });
        }
      }
    } catch (error) {
      console.error("Message processing error:", error);
      toast({
        title: "Conversation error",
        description: "I had trouble with that message. Could you try again?",
        variant: "destructive"
      });
    }
  };
  
  // This function handles direct text input
  const handleSendTextMessage = async () => {
    if (!textMessage.trim() || isProcessing || isResponding || !conversation) return;
    
    try {
      await handleMessage(textMessage);
      setTextMessage(''); // Clear the input field after sending
    } catch (error) {
      console.error("Failed to send text message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };
  
  // Function to handle speech recognition in real-time
  const startSpeechRecognition = () => {
    // Create a compatible type for SpeechRecognition
    // @ts-ignore - these browser APIs might not be in the TypeScript definitions
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        // Get the transcript from the speech recognition results
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        setCurrentTranscript(transcript);
      };
      
      recognition.start();
      return recognition;
    }
    
    return null;
  };
  
  // Start listening with live transcription
  const handleStartListening = () => {
    const recognitionInstance = startSpeechRecognition();
    setRecognition(recognitionInstance);
    toggleListening();
  };
  
  // Stop listening and clean up
  const handleStopListening = () => {
    if (recognition) {
      recognition.stop();
      setRecognition(null);
      
      // Process what the user said if we have a transcript
      if (currentTranscript) {
        handleMessage(currentTranscript);
        setCurrentTranscript("");
      }
    }
    
    toggleListening();
  };
  
  const renderMicIcon = () => {
    if (isListening) {
      return <StopCircle className="text-white text-6xl" />;
    }
    return <Mic className="text-white text-6xl" />;
  };
  
  return (
    <>
      <div className="flex flex-col items-center justify-center w-full h-full">
        {/* Text Input Toggle */}
        <div className="mb-6">
          <Button 
            variant="outline" 
            onClick={() => setShowTextInput(!showTextInput)}
            className="mb-4"
          >
            {showTextInput ? "Use Voice Input" : "Use Text Input"}
          </Button>
        </div>
      
        {/* Text Input (when enabled) */}
        {showTextInput ? (
          <div className="w-full max-w-md mb-6">
            <div className="flex gap-2">
              <Input
                value={textMessage}
                onChange={(e) => setTextMessage(e.target.value)}
                placeholder="Type your message to Besty..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isProcessing && !isResponding) {
                    handleSendTextMessage();
                  }
                }}
                disabled={isProcessing || isResponding || !conversation}
              />
              <Button 
                onClick={handleSendTextMessage}
                disabled={isProcessing || isResponding || !textMessage.trim() || !conversation}
              >
                <Send size={18} />
              </Button>
            </div>
            {conversation === null && (
              <p className="text-sm text-red-500 mt-2">
                Please set up your persona first to start chatting
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Main Circle UI (Voice Mode) */}
            <div className="relative">
              <CircleButton
                size="xl"
                ripple={!isListening}
                pulsing={isListening}
                onClick={isListening ? handleStopListening : handleStartListening}
                disabled={isProcessing || isResponding}
                icon={renderMicIcon()}
                aria-label={isListening ? "Stop listening" : "Start talking"}
              />
              
              {/* Audio Waves (shown when active) */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-8">
                <AudioWave visible={isListening} />
              </div>
            </div>
          </>
        )}
        
        {/* Status Text and Live Transcription */}
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-600">{getStatusText()}</p>
          
          {/* Live Transcription - shows what you're saying in real-time */}
          {isListening && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100 max-w-md mx-auto">
              <p className="text-sm text-blue-800 font-medium">
                {currentTranscript || "Listening..."}
              </p>
            </div>
          )}
          
          {(isListening || isResponding) && (
            <p className="mt-2 text-sm text-primary">
              Besty is feeling <span>{persona.mood}</span> today
            </p>
          )}
        </div>
        
        {/* Control Buttons */}
        <div className="flex space-x-4 mt-10 opacity-70">
          <Button
            variant="outline"
            size="icon"
            className="p-3 rounded-full bg-white shadow-sm hover:shadow-md transition"
            onClick={() => setShowTranscript(true)}
            aria-label="Show transcript"
          >
            <FileText className="text-gray-600" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="p-3 rounded-full bg-white shadow-sm hover:shadow-md transition"
            onClick={handleRestartConversation}
            aria-label="Restart conversation"
          >
            <RefreshCw className="text-gray-600" />
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            className="p-3 rounded-full bg-white shadow-sm hover:shadow-md transition"
            onClick={onChangePersona}
            aria-label="Change persona"
          >
            <UserCog className="text-gray-600" />
          </Button>
        </div>
      </div>
      
      {/* Transcript Modal */}
      <TranscriptModal
        open={showTranscript}
        onClose={() => setShowTranscript(false)}
        messages={messages}
      />
    </>
  );
}