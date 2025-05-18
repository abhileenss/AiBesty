import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CircleButton } from '@/components/ui/circle-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic } from 'lucide-react';
import { isValidEmail } from '@/lib/utils';

interface AuthViewProps {
  onSuccess: () => void;
}

export function AuthView({ onSuccess }: AuthViewProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const { sendMagicLink, authenticating } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email');
      return;
    }
    
    setEmailError('');
    
    // Send magic link
    const success = await sendMagicLink(email);
    if (success) {
      onSuccess();
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md text-center">
      <h1 className="font-poppins font-bold text-3xl sm:text-4xl mb-4">Meet Your AI Besty</h1>
      <p className="text-lg mb-8 text-gray-600">A voice-first companion who listens, responds, and adapts to you.</p>
      
      <div className="circle-ripple mb-10">
        <CircleButton 
          size="lg"
          ripple
          aria-label="Start voice conversation"
          icon={<Mic className="text-white text-4xl" />}
        />
      </div>
      
      <form className="w-full space-y-4" onSubmit={handleSubmit}>
        <div className="relative">
          <Input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            className="w-full px-4 py-3 rounded-full border border-neutral-border focus:outline-none focus:ring-2 focus:ring-primary"
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : undefined}
          />
          {emailError && (
            <p id="email-error" className="text-destructive text-sm mt-1 text-left">
              {emailError}
            </p>
          )}
        </div>
        <Button
          type="submit"
          className="w-full bg-primary text-white py-3 px-6 rounded-full font-medium transition hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          disabled={authenticating}
        >
          {authenticating ? 'Sending...' : 'Get Started'}
        </Button>
      </form>
      
      <p className="mt-6 text-sm text-gray-500">Just one click. No password needed.</p>
    </div>
  );
}
