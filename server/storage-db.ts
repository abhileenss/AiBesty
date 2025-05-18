import { db } from './db';
import { users, personas, conversations, messages, authTokens } from '@shared/schema';
import type { 
  User, InsertUser, 
  Persona, InsertPersona, 
  Conversation, InsertConversation, 
  Message, InsertMessage,
  AuthToken, InsertAuthToken
} from '@shared/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { IStorage } from './storage';

/**
 * Database storage implementation for AI Besty
 */
export class DatabaseStorage implements IStorage {
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      emailVerified: false,
      createdAt: new Date()
    }).returning();
    return user;
  }

  // Auth token methods
  async createAuthToken(email: string): Promise<AuthToken> {
    const token = Array(64)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join('');
    
    const [authToken] = await db.insert(authTokens).values({
      token,
      email,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
      createdAt: new Date()
    }).returning();
    
    return authToken;
  }

  async validateAuthToken(token: string): Promise<User | undefined> {
    // Find the token
    const [authToken] = await db.select().from(authTokens).where(eq(authTokens.token, token));
    
    if (!authToken || authToken.expiresAt < new Date()) {
      return undefined;
    }
    
    // Get the user associated with this token
    const user = await this.getUserByEmail(authToken.email);
    
    if (user) {
      // Optionally, mark the user as verified
      await db.update(users)
        .set({ emailVerified: true })
        .where(eq(users.id, user.id));
      
      // Update the user object
      user.emailVerified = true;
    }
    
    return user;
  }

  // Persona methods
  async getPersona(id: number): Promise<Persona | undefined> {
    const [persona] = await db.select().from(personas).where(eq(personas.id, id));
    return persona;
  }

  async getPersonasByUserId(userId: number): Promise<Persona[]> {
    return db.select().from(personas).where(eq(personas.userId, userId));
  }

  async createPersona(insertPersona: InsertPersona): Promise<Persona> {
    const now = new Date();
    const [persona] = await db.insert(personas).values({
      ...insertPersona,
      createdAt: now,
      updatedAt: now
    }).returning();
    return persona;
  }

  async updatePersona(id: number, updates: Partial<InsertPersona>): Promise<Persona | undefined> {
    const [updatedPersona] = await db.update(personas)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(personas.id, id))
      .returning();
    
    return updatedPersona;
  }

  // Conversation methods
  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return db.select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const now = new Date();
    const [conversation] = await db.insert(conversations).values({
      ...insertConversation,
      createdAt: now,
      updatedAt: now
    }).returning();
    return conversation;
  }

  async updateConversationTitle(id: number, title: string): Promise<Conversation | undefined> {
    const [updatedConversation] = await db.update(conversations)
      .set({
        title,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }

  // Message methods
  async getMessage(id: number): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values({
      ...insertMessage,
      createdAt: new Date()
    }).returning();
    
    // Update the associated conversation's updatedAt timestamp
    await db.update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, insertMessage.conversationId));
    
    return message;
  }
}