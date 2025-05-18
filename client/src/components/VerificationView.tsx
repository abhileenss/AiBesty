import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { MailIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VerificationViewProps {
  email: string;
  onVerified: () => void;
  onResend: () => void;
}

export function VerificationView({ email, onVerified, onResend }: VerificationViewProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [token, setToken] = useState('');
  const { verifyToken, sendMagicLink, authenticating } = useAuth();
  const { toast } = useToast();
  
  // Auto-verify in development mode
  useEffect(() => {
    const performAutoVerify = async () => {
      try {
        // Send magic link to get token
        const result = await sendMagicLink(email);
        
        if (result.success && result.token) {
          setToken(result.token);
          
          // Automatically verify after a short delay
          setTimeout(async () => {
            const success = await verifyToken(result.token);
            if (success) {
              toast({
                title: "Verification successful",
                description: "You're now logged in automatically (development mode)",
              });
              onVerified();
            }
          }, 2000);
        }
      } catch (error) {
        console.error("Auto-verification error:", error);
      }
    };
    
    performAutoVerify();
  }, [email, verifyToken, onVerified]);
  
  // Check if there's a token in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      verifyToken(urlToken).then(success => {
        if (success) {
          // Clear the token from the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          onVerified();
        }
      });
    }
  }, [verifyToken, onVerified]);
  
  // Countdown for resend button
  useEffect(() => {
    if (secondsLeft <= 0) {
      setCanResend(true);
      return;
    }
    
    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [secondsLeft]);
  
  const handleResend = async () => {
    if (!canResend || authenticating) return;
    
    const result = await sendMagicLink(email);
    if (result.success) {
      setCanResend(false);
      setSecondsLeft(30);
      onResend();
      
      if (result.token) {
        setToken(result.token);
      }
      
      toast({
        title: "Magic link sent",
        description: "We've sent a new magic link to your email",
      });
    }
  };
  
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md text-center">
      <MailIcon className="text-5xl text-primary mb-6" />
      <h2 className="font-poppins font-bold text-2xl mb-3">Check your email</h2>
      <p className="text-gray-600 mb-8">
        We sent a magic link to <span className="font-medium">{email}</span>
      </p>
      
      <div className="w-full max-w-xs border border-neutral-border rounded-lg p-4 bg-white mb-8">
        <p className="text-sm text-left font-medium mb-2">From: AI Besty</p>
        <p className="text-sm text-left mb-3">Subject: Your magic link</p>
        <div className="border-t border-neutral-border pt-3">
          <p className="text-sm text-left">Click the button in the email to sign in instantly.</p>
        </div>
      </div>
      
      <Button
        variant="link"
        className="text-primary hover:underline"
        onClick={handleResend}
        disabled={!canResend || authenticating}
      >
        {!canResend 
          ? `Resend magic link (${secondsLeft}s)` 
          : authenticating 
            ? 'Sending...' 
            : 'Resend magic link'
        }
      </Button>
    </div>
  );
}
