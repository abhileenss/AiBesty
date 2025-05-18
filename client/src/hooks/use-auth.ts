import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import type { User, AuthRequest, AuthResponse, VerifyTokenRequest, VerifyTokenResponse } from '@/lib/types';
import { isValidEmail } from '@/lib/utils';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authenticating, setAuthenticating] = useState<boolean>(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  // Send magic link email
  const sendMagicLink = async (email: string): Promise<{ success: boolean, token?: string }> => {
    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return { success: false };
    }
    
    setAuthenticating(true);
    
    try {
      const request: AuthRequest = { email };
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        credentials: 'include'
      });
      
      const data: AuthResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }
      
      toast({
        title: "Magic link sent",
        description: "Use the token below for direct login during testing"
      });
      
      return { 
        success: true,
        // For development testing, use the token that's returned directly
        token: data.token
      };
    } catch (error) {
      toast({
        title: "Authentication failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      return { success: false };
    } finally {
      setAuthenticating(false);
    }
  };

  // Verify magic link token
  const verifyToken = async (token: string): Promise<boolean> => {
    setAuthenticating(true);
    
    try {
      const request: VerifyTokenRequest = { token };
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        credentials: 'include'
      });
      
      const data: VerifyTokenResponse = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.success ? 'Authentication failed' : 'Invalid or expired token');
      }
      
      if (data.user) {
        setUser(data.user);
        return true;
      }
      
      return false;
    } catch (error) {
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
      return false;
    } finally {
      setAuthenticating(false);
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      setUser(null);
      setLocation('/');
      
      toast({
        title: "Logged out",
        description: "You have been successfully logged out"
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive"
      });
    }
  };

  return {
    user,
    loading,
    authenticating,
    sendMagicLink,
    verifyToken,
    logout,
    isAuthenticated: !!user
  };
}
