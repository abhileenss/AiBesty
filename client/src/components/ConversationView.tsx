import { useState, useEffect, useRef } from 'react';
import { CircleButton } from '@/components/ui/circle-button';
import { AudioWave } from '@/components/ui/audio-wave';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, FileText, RefreshCw, UserCog } from 'lucide-react';
import { useConversation } from '@/hooks/use-conversation';
import { TranscriptModal } from '@/components/TranscriptModal';
import type { Persona } from '@/lib/types';

interface ConversationViewProps {
  userId: number;
  persona: Persona;
  onChangePersona: () => void;
}

export function ConversationView({ userId, persona, onChangePersona }: ConversationViewProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  
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
    return "Tap the circle to start talking";
  };
  
  const handleRestartConversation = async () => {
    await createConversation(persona.id);
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
        {/* Main Circle UI */}
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
