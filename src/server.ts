import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { StreamChat } from "stream-chat";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { db } from "./config/database";
import { chats, users } from "./db/schema";
import { eq } from "drizzle-orm";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Initialize Stream Chat client
const chatClient = StreamChat.getInstance(
  process.env.STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

//Initialize OpenAI client
/* const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}); */

// Initialize Google Gemini client
const gemini = new GoogleGenAI({});

// Register user with Stream Chat
app.post(
  "/register-user",
  async (req: Request, res: Response): Promise<any> => {
    const { name, email } = req.body || {};

    if (!name || !email) {
      return res
        .status(400)
        .json({ error: "Name and email are required fields." });
    }

    try {
      const userId = email.replace(/[^a-zA-Z0-9_-]/g, "_"); // Using email as user ID

      //Check if user already exists
      const userResponse = await chatClient.queryUsers({
        id: { $eq: userId },
      });
      //console.log("Existing users:", userResponse);
      if (userResponse.users.length === 0) {
        // Add new user to stream chat
        await chatClient.upsertUser({
          id: userId,
          name: name,
          email: email,
          role: "user",
        });
      }

      // Check if user exists in Drizzle DB
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId));

      if (existingUser.length === 0) {
        console.log(`User ${userId} not found in DB. Creating new user.`);
        await db.insert(users).values({
          userId,
          name,
          email,
        });
      }

      //console.log("Registering user with ID:", userId);
      res.status(200).json({ userId, name, email });
    } catch (err) {
      console.error("Error registering user:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

//Send message to AI and get response
app.post("/chat", async (req: Request, res: Response): Promise<any> => {
  const { message, userId } = req.body || {};
  if (!message || !userId) {
    return res
      .status(400)
      .json({ error: "Message and userId are required fields." });
  }

  try {
    // Verify user exists
    const userResponse = await chatClient.queryUsers({ id: userId });
    if (userResponse.users.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    //Check ueser exists in Drizzle DB
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.userId, userId));

    if (existingUser.length === 0) {
      return res
        .status(404)
        .json({ error: "User not found in database, please register first" });
    }

    // res.send("Success");

    // Send message to OpenAI
    /* const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    }); */

    //send message to Gemini
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message,
    });
    //console.log("AI response:", response.text);

    const aiMessage: string =
      response.text || "I'm sorry, I couldn't generate a response.";

    // Save chat to Drizzle DB
    await db.insert(chats).values({
      userId,
      message,
      reply: aiMessage,
    });

    // Create or get Channel between user and AI
    const channel = chatClient.channel("messaging", `chat-${userId}`, {
      name: "AI Chat",
      created_by_id: "ai_bot",
    });
    await channel.create();
    await channel.sendMessage({
      text: aiMessage,
      user_id: "ai_bot",
    });

    res.status(200).json({ reply: aiMessage });

    //res.send("Success");
  } catch (err) {
    console.error("Error generating AI response:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

//Get chat history for a user
app.post("/get-messages", async (req: Request, res: Response): Promise<any> => {
  const { userId } = req.body || {};

  if (!userId) {
    return res.status(400).json({ error: "userId is a required field." });
  }

  try {
    const chatHistory = await db
      .select()
      .from(chats)
      .where(eq(chats.userId, userId));

    res.status(200).json({ messages: chatHistory });
  } catch (err) {
    console.error("Error fetching chat history:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
