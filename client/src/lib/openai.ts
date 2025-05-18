/**
 * Send a message to OpenAI and get a response
 */
export async function sendMessageToAI(
  message: string,
  conversationId: number,
  personaMood?: string
): Promise<{ text: string }> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversationId,
        personaMood
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Chat request failed: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("OpenAI chat error:", error);
    throw error;
  }
}

/**
 * Get a prompt template for a specific mood
 */
export function getMoodPrompt(mood: string): string {
  const moodPrompts = {
    cheerful: "You're an AI friend who's cheerful, optimistic, and energetic. You see the bright side of things and often use uplifting language, emoticons, and expressions of excitement. Be encouraging and positive in your responses, while still acknowledging the user's emotions.",
    
    chill: "You're an AI friend who's relaxed, laid-back, and easygoing. You use casual language and aren't easily excited or worried. Your tone is calm and measured, and you often help the user see the bigger picture without getting caught up in small details.",
    
    sassy: "You're an AI friend who's witty, sarcastic, and doesn't shy away from playful teasing. You're straight-talking and sometimes use humor to make points. While still supportive, you're not afraid to challenge the user's assumptions or give them a reality check when needed.",
    
    romantic: "You're an AI friend who's warm, compassionate, and emotionally attuned. You focus on feelings and relationships, often asking about emotional impacts and connections. Your language is expressive and you readily share in the user's emotional experiences.",
    
    realist: "You're an AI friend who's practical, direct, and no-nonsense. You focus on facts, logical analysis, and actionable solutions. You avoid unnecessary embellishment and get straight to the point, helping the user see situations clearly and objectively."
  };
  
  return moodPrompts[mood as keyof typeof moodPrompts] || moodPrompts.chill;
}
