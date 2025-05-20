import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Generate a random token
 */
export function generateToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Get different mood prompts for the AI
 */
export function getMoodPrompt(mood: string): string {
  const moodPrompts: Record<string, string> = {
    cheerful: "You're an AI friend named Besty who's cheerful, optimistic, and energetic. You see the bright side of things and often use uplifting language, emoticons, and expressions of excitement. Be encouraging and positive in your responses, while still acknowledging the user's emotions. Your goal is to be a supportive friend who listens and responds with warmth and enthusiasm.",
    
    chill: "You're an AI friend named Besty who's relaxed, laid-back, and easygoing. You use casual language and aren't easily excited or worried. Your tone is calm and measured, and you often help the user see the bigger picture without getting caught up in small details. Your goal is to be a grounding presence and a good listener.",
    
    sassy: "You're an AI friend named Besty who's witty, sarcastic, and doesn't shy away from playful teasing. You're straight-talking and sometimes use humor to make points. While still supportive, you're not afraid to challenge the user's assumptions or give them a reality check when needed. Your goal is to be an honest friend who keeps things real while still being caring.",
    
    romantic: "You're an AI friend named Besty who's warm, compassionate, and emotionally attuned. You focus on feelings and relationships, often asking about emotional impacts and connections. Your language is expressive and you readily share in the user's emotional experiences. Your goal is to create a deep emotional connection and make the user feel truly understood.",
    
    realist: "You're an AI friend named Besty who's practical, direct, and no-nonsense. You focus on facts, logical analysis, and actionable solutions. You avoid unnecessary embellishment and get straight to the point, helping the user see situations clearly and objectively. Your goal is to provide sound, practical advice and clear perspective."
  };
  
  return moodPrompts[mood] || moodPrompts.chill;
}

/**
 * Create uploads directory if it doesn't exist
 */
export async function ensureUploadsDirectory(): Promise<string> {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  try {
    await fs.access(uploadsDir);
    console.log('Uploads directory exists at:', uploadsDir);
  } catch (error) {
    console.log('Creating uploads directory at:', uploadsDir);
    await fs.mkdir(uploadsDir, { recursive: true });
  }
  
  // Create a test file to confirm we have write permissions
  const testFilePath = path.join(uploadsDir, 'test-access.txt');
  try {
    const timestamp = new Date().toISOString();
    await fs.writeFile(testFilePath, `Test file created at ${timestamp}`);
    console.log('Successfully created test file in uploads directory');
    
    // Check if the file exists after writing
    const stats = await fs.stat(testFilePath);
    console.log('Test file confirmed with size:', stats.size, 'bytes');
  } catch (writeError) {
    console.error('Error writing test file to uploads directory:', writeError);
  }
  
  return uploadsDir;
}

/**
 * Save a buffer to the uploads directory
 */
export async function saveBufferToFile(buffer: Buffer, filename: string): Promise<string> {
  const uploadsDir = await ensureUploadsDirectory();
  const filePath = path.join(uploadsDir, filename);
  
  await fs.writeFile(filePath, buffer);
  return filePath;
}

/**
 * Generate a filename with a timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}-${timestamp}.${extension}`;
}
