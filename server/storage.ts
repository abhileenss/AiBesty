import { 
  users, type User, type InsertUser,
  personas, type Persona, type InsertPersona,
  conversations, type Conversation, type InsertConversation,
  messages, type Message, type InsertMessage,
  authTokens, type AuthToken, type InsertAuthToken
} from "@shared/schema";
import { randomBytes } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Auth token methods
  createAuthToken(email: string): Promise<AuthToken>;
  validateAuthToken(token: string): Promise<User | undefined>;
  
  // Persona methods
  getPersona(id: number): Promise<Persona | undefined>;
  getPersonasByUserId(userId: number): Promise<Persona[]>;
  createPersona(persona: InsertPersona): Promise<Persona>;
  updatePersona(id: number, persona: Partial<InsertPersona>): Promise<Persona | undefined>;
  
  // Conversation methods
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: number, title: string): Promise<Conversation | undefined>;
  
  // Message methods
  getMessage(id: number): Promise<Message | undefined>;
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private authTokens: Map<string, AuthToken>;
  private personas: Map<number, Persona>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  
  private userIdCounter: number;
  private personaIdCounter: number;
  private conversationIdCounter: number;
  private messageIdCounter: number;
  private authTokenIdCounter: number;
  
  constructor() {
    this.users = new Map();
    this.authTokens = new Map();
    this.personas = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    
    this.userIdCounter = 1;
    this.personaIdCounter = 1;
    this.conversationIdCounter = 1;
    this.messageIdCounter = 1;
    this.authTokenIdCounter = 1;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      emailVerified: false, 
      createdAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  // Auth token methods
  async createAuthToken(email: string): Promise<AuthToken> {
    const id = this.authTokenIdCounter++;
    const token = randomBytes(32).toString('hex');
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
    
    const authToken: AuthToken = {
      id,
      email,
      token,
      expires,
      used: false,
      createdAt: now
    };
    
    this.authTokens.set(token, authToken);
    return authToken;
  }
  
  async validateAuthToken(token: string): Promise<User | undefined> {
    const authToken = this.authTokens.get(token);
    
    if (!authToken || authToken.used || new Date() > authToken.expires) {
      return undefined;
    }
    
    // Mark token as used
    authToken.used = true;
    this.authTokens.set(token, authToken);
    
    // Get or create user
    let user = await this.getUserByEmail(authToken.email);
    
    if (!user) {
      user = await this.createUser({ email: authToken.email });
    }
    
    // Update user as verified
    user.emailVerified = true;
    this.users.set(user.id, user);
    
    return user;
  }
  
  // Persona methods
  async getPersona(id: number): Promise<Persona | undefined> {
    return this.personas.get(id);
  }
  
  async getPersonasByUserId(userId: number): Promise<Persona[]> {
    return Array.from(this.personas.values()).filter(persona => persona.userId === userId);
  }
  
  async createPersona(insertPersona: InsertPersona): Promise<Persona> {
    const id = this.personaIdCounter++;
    const now = new Date();
    
    const persona: Persona = {
      ...insertPersona,
      id,
      voice: insertPersona.voice || 'female',
      mood: insertPersona.mood || 'chill',
      customVoiceId: insertPersona.customVoiceId || null,
      customMoodSettings: insertPersona.customMoodSettings || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.personas.set(id, persona);
    return persona;
  }
  
  async updatePersona(id: number, updates: Partial<InsertPersona>): Promise<Persona | undefined> {
    const persona = await this.getPersona(id);
    
    if (!persona) {
      return undefined;
    }
    
    const updatedPersona: Persona = {
      ...persona,
      ...updates,
      updatedAt: new Date()
    };
    
    this.personas.set(id, updatedPersona);
    return updatedPersona;
  }
  
  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conversation => conversation.userId === userId);
  }
  
  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.conversationIdCounter++;
    const now = new Date();
    
    const conversation: Conversation = {
      ...insertConversation,
      id,
      title: insertConversation.title || 'New Conversation',
      personaId: insertConversation.personaId || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.conversations.set(id, conversation);
    return conversation;
  }
  
  async updateConversationTitle(id: number, title: string): Promise<Conversation | undefined> {
    const conversation = await this.getConversation(id);
    
    if (!conversation) {
      return undefined;
    }
    
    const updatedConversation: Conversation = {
      ...conversation,
      title,
      updatedAt: new Date()
    };
    
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  
  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    return this.messages.get(id);
  }
  
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.getTime() : 0;
        const bTime = b.createdAt ? b.createdAt.getTime() : 0;
        return aTime - bTime;
      });
  }
  
  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.messageIdCounter++;
    const now = new Date();
    
    const message: Message = {
      ...insertMessage,
      id,
      content: insertMessage.content,
      conversationId: insertMessage.conversationId,
      audioUrl: insertMessage.audioUrl || null,
      isUserMessage: insertMessage.isUserMessage,
      createdAt: now
    };
    
    this.messages.set(id, message);
    return message;
  }
}

export const storage = new MemStorage();
