import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  real,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table (mandatory for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (mandatory for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional data like voice transcription, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority").notNull().default('medium'), // 'low', 'medium', 'high'
  status: varchar("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Health tracking table
export const healthEntries = pgTable("health_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  sleepHours: real("sleep_hours"),
  steps: integer("steps"),
  weight: real("weight"),
  mood: integer("mood"), // 1-10 scale
  energy: integer("energy"), // 1-10 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Financial tracking table
export const financialEntries = pgTable("financial_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // 'income', 'expense'
  category: varchar("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mood tracking table
export const moodEntries = pgTable("mood_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  mood: integer("mood").notNull(), // 1-10 scale
  energy: integer("energy"), // 1-10 scale
  stress: integer("stress"), // 1-10 scale
  notes: text("notes"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  mood: integer("mood"), // 1-10 scale
  aiInsights: text("ai_insights"), // AI-generated insights
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  theme: varchar("theme").default('dark'),
  voiceEnabled: boolean("voice_enabled").default(true),
  notifications: jsonb("notifications").default({}),
  aiPersonality: varchar("ai_personality").default('helpful'),
  timezone: varchar("timezone").default('UTC'),
  language: varchar("language").default('en'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  conversations: many(conversations),
  tasks: many(tasks),
  healthEntries: many(healthEntries),
  financialEntries: many(financialEntries),
  moodEntries: many(moodEntries),
  journalEntries: many(journalEntries),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
}));

export const healthEntriesRelations = relations(healthEntries, ({ one }) => ({
  user: one(users, { fields: [healthEntries.userId], references: [users.id] }),
}));

export const financialEntriesRelations = relations(financialEntries, ({ one }) => ({
  user: one(users, { fields: [financialEntries.userId], references: [users.id] }),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  user: one(users, { fields: [moodEntries.userId], references: [users.id] }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertHealthEntrySchema = createInsertSchema(healthEntries);
export const insertFinancialEntrySchema = createInsertSchema(financialEntries);
export const insertMoodEntrySchema = createInsertSchema(moodEntries);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const insertUserPreferencesSchema = createInsertSchema(userPreferences);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type HealthEntry = typeof healthEntries.$inferSelect;
export type InsertHealthEntry = z.infer<typeof insertHealthEntrySchema>;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type InsertFinancialEntry = z.infer<typeof insertFinancialEntrySchema>;
export type MoodEntry = typeof moodEntries.$inferSelect;
export type InsertMoodEntry = z.infer<typeof insertMoodEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
