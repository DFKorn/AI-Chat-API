# Chat AI API
This is the backend for the Chat AI application. It is a Node/Express/TypeScript API that uses [Stream](https://getstream.io/) for chat, chat history, and user management.

## Technical Stack
 - Node.js
 - Express.js
 - TypeScript
 - [Stream Chat Messaging](https://getstream.io/) - used for chat, chat history, and user management.
 - Google Gemini (Gemini 2.5 Flash) - used for the AI chatbot

### Database 
- Neon Database - stores user information and chat history
- Drizzle ORM (PostgreSQL with Neon driver) - used for interaction with the database

## Endpoints
- POST /register-user - Create a user in Stream chat and in the database
- POST /chat - Creates a new Stream chat channel, sends a request to Google Gemini to generate a response, and saves the chat history the database
- POST /get-messages - Get's the chat history for a specific user
