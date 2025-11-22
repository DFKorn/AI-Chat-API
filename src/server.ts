import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { StreamChat } from "stream-chat";

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
      //console.log("Registering user with ID:", userId);
      res.status(200).json({ userId, name, email });
    } catch (err) {
      console.error("Error registering user:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
