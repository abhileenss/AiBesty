import { Request, Response } from 'express';
import { storage } from '../storage';
import { getAIResponse } from '../lib/openai';

/**
 * Handle chat requests for the AI Besty application
 */
export async function handleChatRequest(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const { message, conversationId, personaMood } = req.body;
    
    if (!message || !conversationId) {
      return res.status(400).json({ message: 'Message and conversation ID are required' });
    }
    
    // Get conversation to verify ownership
    const conversation = await storage.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }
    
    if (conversation.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to access this conversation' });
    }
    
    // Get all messages for context
    const messages = await storage.getMessagesByConversationId(conversationId);
    
    // Generate AI response 
    try {
      // Use specific mood if provided or get from persona
      let effectiveMood = personaMood;
      
      if (!effectiveMood && conversation.personaId) {
        const persona = await storage.getPersona(conversation.personaId);
        if (persona) {
          effectiveMood = persona.mood;
        }
      }
      
      // Default mood if none is found
      if (!effectiveMood) {
        effectiveMood = 'chill';
      }
      
      // Get AI response
      const aiResponseText = await getAIResponse(
        message,
        conversation,
        messages,
        effectiveMood
      );
      
      // Create AI message in the database
      await storage.createMessage({
        conversationId,
        content: aiResponseText,
        isUserMessage: false
      });
      
      // Return AI response text
      return res.status(200).json({ 
        text: aiResponseText,
        success: true 
      });
      
    } catch (aiError) {
      console.error('AI response error:', aiError);
      return res.status(500).json({ 
        message: 'Failed to generate AI response',
        success: false
      });
    }
  } catch (error) {
    console.error('Chat error:', error);
    return res.status(500).json({ 
      message: 'Failed to process chat request',
      success: false
    });
  }
}