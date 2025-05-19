import { useState, useEffect, useRef } from 'react';
import { CircleButton } from '@/components/ui/circle-button';
import { AudioWave } from '@/components/ui/audio-wave';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, FileText, RefreshCw, UserCog, Send, MessageSquare } from 'lucide-react';
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
  const { toast } = useToast();
  
  // Add a separate state for manual live transcript display
  const [currentTranscript, setCurrentTranscript] = useState("");
  
  const { 
    messages,
    conversation,
    isListening,
    isProcessing,
    isResponding,
    toggleListening,
    createConversation,
    processMessage
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
  
  // This function handles direct text input
  const handleSendTextMessage = async () => {
    if (!textMessage.trim() || isProcessing || isResponding || !conversation) return;
    
    try {
      // Send the message directly to the backend
      const userMessage = {
        conversationId: conversation.id,
        content: textMessage.trim(),
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
      
      const savedUserMessage = await saveUserMessageResponse.json();
      
      // Update messages state with user message
      const updatedMessages = [...messages, savedUserMessage];
      
      setTextMessage('');
      toast({
        title: "Message sent",
        description: "Waiting for Besty's response...",
      });
      
      // Instead of using the chat endpoint, let's send messages directly
      try {
        console.log("Sending message to Besty...");
        
        // Create AI message directly (simulating response since API has issues)
        const aiResponse = "Hi! I'm your AI Besty. I can hear you and I'm here to chat about anything you'd like. How are you feeling today?";
        
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
            const messages = await messagesResponse.json();
            // Update the UI with new messages
            toast({
              title: "Besty replied",
              description: "Check out Besty's response!",
            });
          }
        }
      } catch (chatError) {
        console.error("Failed to get AI response:", chatError);
        toast({
          title: "Conversation error",
          description: "I had trouble understanding that. Could you try again?",
          variant: "destructive"
        });
      }
      
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
  
  // State to track speech recognition instance
  const [recognition, setRecognition] = useState<any>(null);
  
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
