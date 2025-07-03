import {
  users,
  conversations,
  messages,
  tasks,
  healthEntries,
  financialEntries,
  moodEntries,
  journalEntries,
  userPreferences,
  type User,
  type UpsertUser,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Task,
  type InsertTask,
  type HealthEntry,
  type InsertHealthEntry,
  type FinancialEntry,
  type InsertFinancialEntry,
  type MoodEntry,
  type InsertMoodEntry,
  type JournalEntry,
  type InsertJournalEntry,
  type UserPreferences,
  type InsertUserPreferences,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string, userId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Message operations
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Health operations
  getHealthEntries(userId: string, startDate?: Date, endDate?: Date): Promise<HealthEntry[]>;
  createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry>;
  getLatestHealthEntry(userId: string): Promise<HealthEntry | undefined>;
  
  // Financial operations
  getFinancialEntries(userId: string, startDate?: Date, endDate?: Date): Promise<FinancialEntry[]>;
  createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry>;
  
  // Mood operations
  getMoodEntries(userId: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  getLatestMoodEntry(userId: string): Promise<MoodEntry | undefined>;
  
  // Journal operations
  getJournalEntries(userId: string, startDate?: Date, endDate?: Date): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  
  // User preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Analytics
  getUserStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    avgMood: number;
    avgEnergy: number;
    totalConversations: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Conversation operations
  async getConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string, userId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updatedConversation;
  }

  // Message operations
  async getMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  // Task operations
  async getTasks(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db
      .insert(tasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Health operations
  async getHealthEntries(userId: string, startDate?: Date, endDate?: Date): Promise<HealthEntry[]> {
    let query = db.select().from(healthEntries).where(eq(healthEntries.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(healthEntries.userId, userId),
        gte(healthEntries.date, startDate),
        lte(healthEntries.date, endDate)
      ));
    }
    
    return await query.orderBy(desc(healthEntries.date));
  }

  async createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry> {
    const [newEntry] = await db
      .insert(healthEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getLatestHealthEntry(userId: string): Promise<HealthEntry | undefined> {
    const [entry] = await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.userId, userId))
      .orderBy(desc(healthEntries.date))
      .limit(1);
    return entry;
  }

  // Financial operations
  async getFinancialEntries(userId: string, startDate?: Date, endDate?: Date): Promise<FinancialEntry[]> {
    let query = db.select().from(financialEntries).where(eq(financialEntries.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(financialEntries.userId, userId),
        gte(financialEntries.date, startDate),
        lte(financialEntries.date, endDate)
      ));
    }
    
    return await query.orderBy(desc(financialEntries.date));
  }

  async createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry> {
    const [newEntry] = await db
      .insert(financialEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  // Mood operations
  async getMoodEntries(userId: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]> {
    let query = db.select().from(moodEntries).where(eq(moodEntries.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(moodEntries.userId, userId),
        gte(moodEntries.date, startDate),
        lte(moodEntries.date, endDate)
      ));
    }
    
    return await query.orderBy(desc(moodEntries.date));
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [newEntry] = await db
      .insert(moodEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getLatestMoodEntry(userId: string): Promise<MoodEntry | undefined> {
    const [entry] = await db
      .select()
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId))
      .orderBy(desc(moodEntries.date))
      .limit(1);
    return entry;
  }

  // Journal operations
  async getJournalEntries(userId: string, startDate?: Date, endDate?: Date): Promise<JournalEntry[]> {
    let query = db.select().from(journalEntries).where(eq(journalEntries.userId, userId));
    
    if (startDate && endDate) {
      query = query.where(and(
        eq(journalEntries.userId, userId),
        gte(journalEntries.date, startDate),
        lte(journalEntries.date, endDate)
      ));
    }
    
    return await query.orderBy(desc(journalEntries.date));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  // User preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db
      .insert(userPreferences)
      .values(preferences)
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    return prefs;
  }

  // Analytics
  async getUserStats(userId: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    avgMood: number;
    avgEnergy: number;
    totalConversations: number;
  }> {
    const [taskStats] = await db
      .select({
        totalTasks: sql<number>`count(*)`,
        completedTasks: sql<number>`count(case when status = 'completed' then 1 end)`,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const [moodStats] = await db
      .select({
        avgMood: sql<number>`avg(mood)`,
        avgEnergy: sql<number>`avg(energy)`,
      })
      .from(moodEntries)
      .where(eq(moodEntries.userId, userId));

    const [convStats] = await db
      .select({
        totalConversations: sql<number>`count(*)`,
      })
      .from(conversations)
      .where(eq(conversations.userId, userId));

    return {
      totalTasks: taskStats.totalTasks || 0,
      completedTasks: taskStats.completedTasks || 0,
      avgMood: moodStats.avgMood || 0,
      avgEnergy: moodStats.avgEnergy || 0,
      totalConversations: convStats.totalConversations || 0,
    };
  }
}

export const storage = new DatabaseStorage();
