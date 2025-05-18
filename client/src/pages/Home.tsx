import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthView } from '@/components/AuthView';
import { VerificationView } from '@/components/VerificationView';
import { PersonaConfigView } from '@/components/PersonaConfigView';
import { ConversationView } from '@/components/ConversationView';
import type { AppView, VoiceType, MoodType, Persona } from '@/lib/types';

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>('auth');
  const [userEmail, setUserEmail] = useState('');
  const [persona, setPersona] = useState<Persona | null>(null);
  const { user, loading, isAuthenticated } = useAuth();
  
  // Set up header and footer visibility based on current view
  const showLogo = currentView !== 'auth' && currentView !== 'verification';
  const showSettings = currentView !== 'auth' && currentView !== 'verification';
  const showFooter = currentView !== 'conversation';
  
  // Check auth state on mount
  useEffect(() => {
    if (loading) return;
    
    if (isAuthenticated && user) {
      // Check if user has persona
      checkUserPersona();
    } else {
      setCurrentView('auth');
    }
  }, [loading, isAuthenticated, user]);
  
  // Check if user has a persona set up
  const checkUserPersona = async () => {
    try {
      const response = await fetch('/api/personas/current', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data) {
          setPersona(data);
          setCurrentView('conversation');
        } else {
          setCurrentView('persona');
        }
      } else {
        setCurrentView('persona');
      }
    } catch (error) {
      console.error("Error checking persona:", error);
      setCurrentView('persona');
    }
  };
  
  // Handle auth success
  const handleAuthSuccess = (email: string) => {
    setUserEmail(email);
    setCurrentView('verification');
  };
  
  // Handle verification success
  const handleVerified = () => {
    setCurrentView('persona');
  };
  
  // Handle persona selection
  const handlePersonaSelected = async (voice: VoiceType, mood: MoodType) => {
    try {
      const response = await fetch('/api/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voice, mood }),
        credentials: 'include'
      });
      
      if (response.ok) {
        const newPersona = await response.json();
        setPersona(newPersona);
        setCurrentView('conversation');
      }
    } catch (error) {
      console.error("Error saving persona:", error);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="w-full py-4 px-6 flex justify-between items-center">
        <div className="logo text-xl font-poppins font-bold text-primary">
          <span className={showLogo ? '' : 'hidden'}>AI Besty</span>
        </div>
        <div className={showSettings ? '' : 'hidden'}>
          <button className="text-neutral-text hover:text-primary transition">
            <i className="ri-settings-4-line text-xl"></i>
          </button>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center relative px-4">
        {currentView === 'auth' && (
          <AuthView onSuccess={() => handleAuthSuccess(userEmail)} />
        )}
        
        {currentView === 'verification' && (
          <VerificationView 
            email={userEmail} 
            onVerified={handleVerified}
            onResend={() => {}}
          />
        )}
        
        {currentView === 'persona' && (
          <PersonaConfigView onComplete={handlePersonaSelected} />
        )}
        
        {currentView === 'conversation' && user && persona && (
          <ConversationView 
            userId={user.id} 
            persona={persona}
            onChangePersona={() => setCurrentView('persona')}
          />
        )}
      </main>
      
      {/* Footer */}
      {showFooter && (
        <footer className="py-4 px-6 text-center text-sm text-gray-500">
          <p>AI Besty &copy; {new Date().getFullYear()} - Voice-first AI companion</p>
        </footer>
      )}
    </div>
  );
}
