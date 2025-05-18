import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { 
  Smile, 
  Meh, 
  ThumbsUp, 
  HeartHandshake, 
  Brain, 
  Settings, 
  MicIcon, 
  Upload
} from 'lucide-react';
import type { VoiceType, MoodType } from '@/lib/types';

interface PersonaConfigViewProps {
  onComplete: (voice: VoiceType, mood: MoodType) => void;
}

export function PersonaConfigView({ onComplete }: PersonaConfigViewProps) {
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('female');
  const [selectedMood, setSelectedMood] = useState<MoodType>('cheerful');
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  
  const handleCustomVoiceUpload = () => {
    toast({
      title: "Coming Soon",
      description: "Custom voice upload will be available in a future update",
    });
  };
  
  const handleSubmit = () => {
    if (selectedVoice === 'custom') {
      toast({
        title: "Custom voice not available yet",
        description: "Please select male or female voice for now",
        variant: "destructive"
      });
      return;
    }
    
    onComplete(selectedVoice, selectedMood);
  };
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg">
      <h2 className="font-poppins font-bold text-2xl mb-6">Customize Your Besty</h2>
      
      {/* Voice Selection */}
      <div className="w-full mb-8">
        <h3 className="font-medium text-lg mb-4 text-center">Choose a voice</h3>
        <div className="flex space-x-4 justify-center">
          <button 
            className={`flex flex-col items-center p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition ${
              selectedVoice === 'male' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedVoice('male')}
          >
            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-2">
              <MicIcon className="text-primary text-2xl" />
            </div>
            <span>Male</span>
          </button>
          
          <button 
            className={`flex flex-col items-center p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition ${
              selectedVoice === 'female' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedVoice('female')}
          >
            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-2">
              <MicIcon className="text-primary text-2xl" />
            </div>
            <span>Female</span>
          </button>
          
          <button 
            className={`flex flex-col items-center p-4 border rounded-xl bg-white shadow-sm hover:shadow-md transition ${
              selectedVoice === 'custom' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={handleCustomVoiceUpload}
          >
            <div className="w-16 h-16 rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-2">
              <Upload className="text-primary text-2xl" />
            </div>
            <span>Custom</span>
          </button>
        </div>
      </div>
      
      {/* Personality Selection */}
      <div className="w-full mb-8">
        <h3 className="font-medium text-lg mb-4 text-center">Choose a personality</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button 
            className={`p-3 border rounded-xl bg-white text-center hover:border-primary transition ${
              selectedMood === 'cheerful' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedMood('cheerful')}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <Smile className="text-amber-500 text-xl" />
            </div>
            <span className="text-sm">Cheerful</span>
          </button>
          
          <button 
            className={`p-3 border rounded-xl bg-white text-center hover:border-primary transition ${
              selectedMood === 'chill' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedMood('chill')}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-teal-100 flex items-center justify-center mb-2">
              <Meh className="text-teal-700 text-xl" />
            </div>
            <span className="text-sm">Chill</span>
          </button>
          
          <button 
            className={`p-3 border rounded-xl bg-white text-center hover:border-primary transition ${
              selectedMood === 'sassy' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedMood('sassy')}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-2">
              <ThumbsUp className="text-red-500 text-xl" />
            </div>
            <span className="text-sm">Sassy</span>
          </button>
          
          <button 
            className={`p-3 border rounded-xl bg-white text-center hover:border-primary transition ${
              selectedMood === 'romantic' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedMood('romantic')}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-pink-100 flex items-center justify-center mb-2">
              <HeartHandshake className="text-pink-500 text-xl" />
            </div>
            <span className="text-sm">Romantic</span>
          </button>
          
          <button 
            className={`p-3 border rounded-xl bg-white text-center hover:border-primary transition ${
              selectedMood === 'realist' ? 'border-primary' : 'border-neutral-border'
            }`}
            onClick={() => setSelectedMood('realist')}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <Brain className="text-gray-700 text-xl" />
            </div>
            <span className="text-sm">Realist</span>
          </button>
          
          <button 
            className="p-3 border border-neutral-border rounded-xl bg-white text-center hover:border-primary transition"
            onClick={() => toast({
              title: "Coming Soon",
              description: "Custom personality design will be available in a future update",
            })}
          >
            <div className="w-10 h-10 mx-auto rounded-full bg-primary bg-opacity-10 flex items-center justify-center mb-2">
              <Settings className="text-primary text-xl" />
            </div>
            <span className="text-sm">Custom</span>
          </button>
        </div>
      </div>
      
      <Button 
        className="w-full max-w-xs bg-primary text-white py-3 px-6 rounded-full font-medium transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        onClick={handleSubmit}
      >
        Start Talking
      </Button>
    </div>
  );
}
