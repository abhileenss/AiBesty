import OpenAI from "openai";
import { getMoodPrompt } from "./utils";
import type { Conversation, Message } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "dummy_key_for_dev" });

/**
 * Get an AI response for a user message
 */
export async function getAIResponse(
  message: string,
  conversation: Conversation,
  messages: Message[],
  personaMood: string = "chill"
): Promise<string> {
  try {
    // Prepare conversation history for context
    const conversationHistory = messages.map(msg => ({
      role: msg.isUserMessage ? "user" : "assistant",
      content: msg.content
    }));
    
    // Get the system prompt for the selected mood
    const systemPrompt = getMoodPrompt(personaMood);
    
    // Create messages array with system message, history, and current message
    const promptMessages = [
      {
        role: "system",
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: "user",
        content: message
      }
    ];
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: promptMessages as any,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    return response.choices[0].message.content || "I'm sorry, I couldn't process that. Could you try again?";
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate AI response');
  }
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
