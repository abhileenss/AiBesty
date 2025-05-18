import type { Conversation, Message } from "@shared/schema";
import OpenAI from "openai";
import * as utils from "./utils";

// Set up OpenAI with provided API key
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key-for-development"
});

/**
 * Get an AI response for a user message (development implementation)
 */
export async function getAIResponse(
  message: string,
  conversation: Conversation,
  messages: Message[],
  personaMood: string = "chill"
): Promise<string> {
  try {
    // For development, we'll use OpenAI if an API key is available, otherwise return a mock response
    if (process.env.OPENAI_API_KEY) {
      // Prepare conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.isUserMessage ? "user" : "assistant",
        content: msg.content
      }));
      
      // Get the system prompt for the selected mood
      const systemPrompt = utils.getMoodPrompt(personaMood);
      
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
        model: "gpt-4o", // the newest OpenAI model released May 13, 2024
        messages: promptMessages as any,
        temperature: 0.7,
        max_tokens: 500,
      });
      
      return response.choices[0].message.content || "I'm sorry, I couldn't process that. Could you try again?";
    } else {
      // If no API key, provide a response based on mood
      console.log('Using mock AI response for message:', message);
      
      const moodResponses = {
        cheerful: "Hey there! That's so interesting! I'm really glad you shared that with me. It's always great to hear what's going on with you!",
        chill: "Cool, I get what you're saying. Life can be like that sometimes. Let's just take it one step at a time.",
        sassy: "Well, well, well... look who's got something to say! That's quite the story you've got there. Want to tell me more?",
        romantic: "I feel so connected when you share things like this with me. It's these little moments of vulnerability that create true bonds between people.",
        realist: "I understand. Let's look at the facts here and figure out the most practical way forward. What do you think are your next steps?"
      };
      
      // Return a response based on the persona's mood
      return moodResponses[personaMood as keyof typeof moodResponses] || 
             "I'm here to listen. Would you like to tell me more about that?";
    }
  } catch (error) {
    console.error('AI response error:', error);
    return "I'm having trouble connecting right now. Could you try again in a moment?";
  }
}
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
