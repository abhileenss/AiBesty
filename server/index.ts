import express, { type Request, Response, NextFunction } from "express";
import session from 'express-session';
import MemoryStore from 'memorystore';
import { setupVite, serveStatic, log } from "./vite";
// Import storage directly instead of using routes
import { storage } from './storage';
import { User } from '../shared/schema';

// Setup type extension for Express Request
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

// Extend session with userId
declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Set up session middleware
  const MemoryStoreSession = MemoryStore(session);
  
  app.use(session({
    secret: process.env.SESSION_SECRET || 'ai-besty-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    })
  }));
  
  // Authentication middleware
  const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: 'Invalid session' });
    }
    
    req.user = user;
    next();
  };

  // Create basic HTTP server
  const server = require('http').createServer(app);
  
  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', version: '1.0.0' });
  });
  
  // Login with email (send magic link)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }
      
      // Create or find user
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        user = await storage.createUser({ email });
      }
      
      // Generate mock auth token - in production this would send an email
      const authToken = await storage.createAuthToken(email);
      
      // Log token for testing
      console.log('=== MAGIC LINK TOKEN (for testing) ===');
      console.log(`Token: ${authToken.token}`);
      console.log('======================================');
      
      return res.status(200).json({ 
        success: true, 
        message: 'Magic link email sent (check server logs for token)',
        token: authToken.token // Note: only included for testing!
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Verify magic link token
  app.post('/api/auth/verify', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ success: false, message: 'Token is required' });
      }
      
      // Validate token and get user
      const user = await storage.validateAuthToken(token);
      
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
      
      // Set session
      req.session.userId = user.id;
      
      return res.status(200).json({ success: true, user });
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });
  
  // Get current user
  app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    res.status(200).json(req.user);
  });
  
  // Basic persona creation
  app.post('/api/personas', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { voice, mood, customVoiceId, customMoodSettings } = req.body;
      
      // Validate input
      if (!voice || !mood) {
        return res.status(400).json({ message: 'Voice and mood are required' });
      }
      
      // Check if user already has a persona
      const userId = req.user.id;
      const existingPersonas = await storage.getPersonasByUserId(userId);
      
      if (existingPersonas.length > 0) {
        // Update existing persona
        const updatedPersona = await storage.updatePersona(existingPersonas[0].id, {
          voice,
          mood,
          customVoiceId,
          customMoodSettings
        });
        
        return res.status(200).json(updatedPersona);
      }
      
      // Create new persona
      const newPersona = await storage.createPersona({
        userId,
        voice,
        mood,
        customVoiceId,
        customMoodSettings
      });
      
      return res.status(201).json(newPersona);
    } catch (error) {
      console.error('Create persona error:', error);
      return res.status(500).json({ message: 'Failed to create persona' });
    }
  });
  
  // Get current user's persona
  app.get('/api/personas/current', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const personas = await storage.getPersonasByUserId(req.user.id);
      
      if (personas.length === 0) {
        return res.status(404).json({ message: 'No persona found' });
      }
      
      return res.status(200).json(personas[0]);
    } catch (error) {
      console.error('Get persona error:', error);
      return res.status(500).json({ message: 'Failed to get persona' });
    }
  });
  
  // Create conversation
  app.post('/api/conversations', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { personaId, title } = req.body;
      
      const newConversation = await storage.createConversation({
        userId: req.user.id,
        personaId,
        title: title || 'New Conversation'
      });
      
      return res.status(201).json(newConversation);
    } catch (error) {
      console.error('Create conversation error:', error);
      return res.status(500).json({ message: 'Failed to create conversation' });
    }
  });
  
  // Get conversation messages
  app.get('/api/conversations/:id/messages', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const conversationId = parseInt(req.params.id);
      
      if (isNaN(conversationId)) {
        return res.status(400).json({ message: 'Invalid conversation ID' });
      }
      
      // Get conversation to verify ownership
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      if (conversation.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this conversation' });
      }
      
      const messages = await storage.getMessagesByConversationId(conversationId);
      
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({ message: 'Failed to get messages' });
    }
  });
  
  // Send message and get AI response
  app.post('/api/messages', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { conversationId, content } = req.body;
      
      // Validate input
      if (!conversationId || !content) {
        return res.status(400).json({ message: 'Conversation ID and content are required' });
      }
      
      // Get conversation to verify ownership
      const conversation = await storage.getConversation(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: 'Conversation not found' });
      }
      
      if (conversation.userId !== req.user.id) {
        return res.status(403).json({ message: 'Not authorized to access this conversation' });
      }
      
      // Get the user's persona for this conversation
      let personaMood = 'chill'; // Default mood
      let personaVoice = 'female'; // Default voice
      
      if (conversation.personaId) {
        const persona = await storage.getPersona(conversation.personaId);
        if (persona) {
          personaMood = persona.mood;
          personaVoice = persona.voice;
        }
      }
      
      // Create user message
      const userMessage = await storage.createMessage({
        conversationId,
        content,
        isUserMessage: true
      });
      
      // Get all messages for context
      const allMessages = await storage.getMessagesByConversationId(conversationId);
      
      // Import and use OpenAI getAIResponse
      const { getAIResponse } = await import('./lib/openai');
      
      // Get AI response
      const aiResponseText = await getAIResponse(
        content, 
        conversation, 
        allMessages, 
        personaMood
      );
      
      // Create AI message in the database
      const aiMessage = await storage.createMessage({
        conversationId,
        content: aiResponseText,
        isUserMessage: false
      });
      
      // Generate audio URL (mock for now)
      const audioUrl = `/api/audio/${aiMessage.id}.mp3`;
      
      return res.status(201).json({
        message: userMessage,
        aiResponse: aiMessage,
        audioUrl
      });
    } catch (error) {
      console.error('Send message error:', error);
      return res.status(500).json({ message: 'Failed to send message' });
    }
  });
  
  // Speech to text conversion
  app.post('/api/speech-to-text', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Check if request has audio data in base64 format
      const { audioBase64 } = req.body;
      
      if (!audioBase64) {
        return res.status(400).json({ message: 'Audio data is required' });
      }
      
      // Mock implementation for development
      // In production, this would call a real speech-to-text service
      const mockResponse = {
        text: "This is a mock transcription of what the user said.",
        confidence: 0.95
      };
      
      // If we have the real API integration available
      if (process.env.OPENAI_API_KEY) {
        try {
          // Use real transcription when available
          const OpenAI = await import('openai');
          const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
          
          // Convert base64 to buffer
          const audioBuffer = Buffer.from(audioBase64, 'base64');
          
          // Save to temporary file
          const fs = await import('fs/promises');
          const path = await import('path');
          const tempFile = path.default.join(import.meta.dirname, 'temp_audio.wav');
          await fs.writeFile(tempFile, audioBuffer);
          
          // Create readable stream from file
          const fsOriginal = await import('fs');
          const audioReadStream = fsOriginal.createReadStream(tempFile);
          
          // Use OpenAI Whisper model
          const transcription = await openai.audio.transcriptions.create({
            file: audioReadStream,
            model: "whisper-1",
          });
          
          // Clean up temp file
          await fs.unlink(tempFile).catch(() => {});
          
          return res.status(200).json({
            text: transcription.text,
            confidence: 0.9 // OpenAI doesn't return confidence, use a reasonable default
          });
        } catch (err) {
          console.error('OpenAI transcription error:', err);
          // Fall back to mock response
          return res.status(200).json(mockResponse);
        }
      } else {
        // Use mock response for development
        return res.status(200).json(mockResponse);
      }
    } catch (error) {
      console.error('Speech to text error:', error);
      return res.status(500).json({ message: 'Failed to convert speech to text' });
    }
  });
  
  // Text to speech conversion
  app.post('/api/text-to-speech', requireAuth, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const { text, voice = 'female', mood = 'chill' } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: 'Text is required' });
      }
      
      // For development, return a mock audio URL
      const mockAudioUrl = '/audio/sample-response.mp3';
      
      return res.status(200).json({ audioUrl: mockAudioUrl });
    } catch (error) {
      console.error('Text to speech error:', error);
      return res.status(500).json({ message: 'Failed to convert text to speech' });
    }
  });
  
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error(err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`AI Besty server running on port ${port}`);
  });
})();
