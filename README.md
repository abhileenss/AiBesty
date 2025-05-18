# AI Besty - Your Voice-First AI Companion

AI Besty is an emotionally-aware AI companion application designed to provide personalized conversation experiences. With both voice and text input options, you can choose how to interact with your AI friend.

## Features

- **Voice & Text Input**: Talk to your AI companion or use text chat
- **Customizable Personas**: Choose your AI's gender and mood
- **Emotionally Aware**: AI adapts its responses based on the selected mood
- **Conversation History**: View your chat history with transcripts
- **Simple Authentication**: Easy login with email

## Installation Guide

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- OpenAI API key (for AI capabilities)

### Step 1: Clone the Repository
```bash
git clone [repository-url]
cd ai-besty
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Setup
Create a `.env` file in the root directory with the following variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/ai_besty
OPENAI_API_KEY=your-openai-api-key
SESSION_SECRET=your-session-secret
```

### Step 4: Database Setup
```bash
npm run db:push
```
This will create all necessary database tables based on the schema.

### Step 5: Start the Application
```bash
npm run dev
```
The application will be available at `http://localhost:5000`

## Usage Guide

### Authentication
1. Enter your email address
2. You'll receive a magic link (for development, the token appears in the console)
3. Use the token to log in

### Creating Your AI Companion
1. Choose your AI's voice (male/female)
2. Select a mood (cheerful, chill, sassy, romantic, realist)
3. Start your conversation

### Conversation
- Click the microphone button to start talking (voice input)
- Or click "Use Text Input" to type messages
- View conversation history by clicking the transcript icon

## Troubleshooting

### Voice Input Issues
If you encounter "request entity too large" errors:
1. Use the text input option instead
2. Ensure your browser has microphone permissions
3. Try shorter voice recordings

### Login Issues
If you're not receiving the magic link:
1. Check your spam folder
2. For development, the token appears in the server console logs
3. Use the token directly by adding it to the URL as `?token=your-token`

## API Documentation

The application provides the following API endpoints:

### Authentication
- `POST /api/auth/login`: Request a magic link
- `POST /api/auth/verify`: Verify a magic link token
- `GET /api/auth/me`: Get current user information

### Personas
- `POST /api/personas`: Create or update a persona
- `GET /api/personas/current`: Get the current user's persona

### Conversations
- `POST /api/conversations`: Create a new conversation
- `GET /api/conversations/recent`: Get the most recent conversation
- `GET /api/conversations/:id/messages`: Get messages for a conversation

### Messages
- `POST /api/messages`: Send a message
- `POST /api/speech-to-text`: Convert speech to text
- `POST /api/text-to-speech`: Convert text to speech

## Voice Fix Instructions

If you're experiencing issues with the voice functionality:

1. **Reduce Audio Size**: The application now automatically reduces audio size, but if you still encounter issues:
   - Use shorter voice recordings (5 seconds or less)
   - Use the text input option as an alternative

2. **Browser Permissions**: Ensure your browser has:
   - Microphone access permitted
   - No extensions blocking audio recording

3. **Try Different Browsers**: Chrome or Firefox are recommended for best compatibility