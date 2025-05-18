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
      
      setTextMessage('');
      
      // Refresh the conversation after sending
      setTimeout(() => {
        // Reload the page to see the updated conversation
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error("Failed to send text message:", error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
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
                onClick={toggleListening}
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
        
        {/* Status Text */}
        <div className="mt-8 text-center">
          <p className="text-lg text-gray-600">{getStatusText()}</p>
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
