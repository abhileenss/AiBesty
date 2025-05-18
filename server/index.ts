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
    res.status(200).json(req.user);
  });
  
  // Basic persona creation
  app.post('/api/personas', requireAuth, async (req: Request, res: Response) => {
    try {
      const { voice, mood, customVoiceId, customMoodSettings } = req.body;
      
      // Validate input
      if (!voice || !mood) {
        return res.status(400).json({ message: 'Voice and mood are required' });
      }
      
      // Check if user already has a persona
      const existingPersonas = await storage.getPersonasByUserId(req.user.id);
      
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
        userId: req.user.id,
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
