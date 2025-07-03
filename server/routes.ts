import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { aiService } from "./services/openai";
import { z } from "zod";
import { insertTaskSchema, insertHealthEntrySchema, insertFinancialEntrySchema, insertMoodEntrySchema, insertJournalEntrySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const conversation = await storage.createConversation({
        userId,
        title: req.body.title || "New Conversation",
      });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Verify conversation belongs to user
      const conversation = await storage.getConversation(id, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const messages = await storage.getMessages(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const { content } = req.body;

      // Verify conversation belongs to user
      const conversation = await storage.getConversation(id, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId: id,
        role: 'user',
        content,
      });

      // Get conversation history for context
      const messages = await storage.getMessages(id);
      const user = await storage.getUser(userId);

      // Generate AI response
      const aiResponse = await aiService.generateResponse({
        userId,
        messages: messages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: msg.createdAt || undefined,
        })),
        userProfile: {
          name: user?.firstName || 'User',
        },
      });

      // Create AI message
      const aiMessage = await storage.createMessage({
        conversationId: id,
        role: 'assistant',
        content: aiResponse,
      });

      res.json({ userMessage, aiMessage });
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Task routes
  app.get('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const tasks = await storage.getTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const taskData = insertTaskSchema.parse({ ...req.body, userId });
      const task = await storage.createTask(taskData);
      res.json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const task = await storage.updateTask(id, updates);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTask(id);
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Health routes
  app.get('/api/health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const healthEntries = await storage.getHealthEntries(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(healthEntries);
    } catch (error) {
      console.error("Error fetching health entries:", error);
      res.status(500).json({ message: "Failed to fetch health entries" });
    }
  });

  app.post('/api/health', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertHealthEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createHealthEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating health entry:", error);
      res.status(500).json({ message: "Failed to create health entry" });
    }
  });

  // Financial routes
  app.get('/api/finances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const financialEntries = await storage.getFinancialEntries(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(financialEntries);
    } catch (error) {
      console.error("Error fetching financial entries:", error);
      res.status(500).json({ message: "Failed to fetch financial entries" });
    }
  });

  app.post('/api/finances', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertFinancialEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createFinancialEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating financial entry:", error);
      res.status(500).json({ message: "Failed to create financial entry" });
    }
  });

  // Mood routes
  app.get('/api/mood', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const moodEntries = await storage.getMoodEntries(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(moodEntries);
    } catch (error) {
      console.error("Error fetching mood entries:", error);
      res.status(500).json({ message: "Failed to fetch mood entries" });
    }
  });

  app.post('/api/mood', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertMoodEntrySchema.parse({ ...req.body, userId });
      const entry = await storage.createMoodEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating mood entry:", error);
      res.status(500).json({ message: "Failed to create mood entry" });
    }
  });

  // Journal routes
  app.get('/api/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      
      const journalEntries = await storage.getJournalEntries(
        userId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(journalEntries);
    } catch (error) {
      console.error("Error fetching journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });

  app.post('/api/journal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { content, title, mood } = req.body;
      
      // Generate AI insights for the journal entry
      const aiInsights = await aiService.generateJournalInsights(content);
      
      const entryData = insertJournalEntrySchema.parse({
        userId,
        title,
        content,
        mood,
        aiInsights,
        date: new Date(),
      });
      
      const entry = await storage.createJournalEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error("Error creating journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const stats = await storage.getUserStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get('/api/analytics/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { type } = req.query;
      
      let insights = "";
      
      if (type === 'health') {
        const healthData = await storage.getHealthEntries(userId);
        insights = await aiService.generateHealthInsights(healthData);
      } else if (type === 'mood') {
        const moodData = await storage.getMoodEntries(userId);
        insights = await aiService.generateMoodInsights(moodData);
      } else if (type === 'tasks') {
        const tasks = await storage.getTasks(userId);
        const result = await aiService.generateTaskPrioritization(tasks);
        insights = result.insights;
      }
      
      res.json({ insights });
    } catch (error) {
      console.error("Error generating insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // Voice routes
  app.post('/api/voice/transcribe', isAuthenticated, async (req: any, res) => {
    try {
      const audioBuffer = Buffer.from(req.body.audio, 'base64');
      const transcription = await aiService.transcribeAudio(audioBuffer);
      res.json({ transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  app.post('/api/voice/synthesize', isAuthenticated, async (req: any, res) => {
    try {
      const { text } = req.body;
      const audioBuffer = await aiService.generateSpeech(text);
      res.set('Content-Type', 'audio/mpeg');
      res.send(audioBuffer);
    } catch (error) {
      console.error("Error synthesizing speech:", error);
      res.status(500).json({ message: "Failed to synthesize speech" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
