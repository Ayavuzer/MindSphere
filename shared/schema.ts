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

// Tenants/Organizations table
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  domain: varchar("domain", { length: 255 }).unique(),
  settings: jsonb("settings").default({}),
  plan: varchar("plan", { length: 50 }).default('basic'),
  status: varchar("status", { length: 20 }).default('active'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-tenant relationship with roles
export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: varchar("role", { length: 50 }).default('member'), // owner, admin, member, viewer
  status: varchar("status", { length: 20 }).default('active'),
  invitedBy: varchar("invited_by"),
  invitedAt: timestamp("invited_at"),
  joinedAt: timestamp("joined_at").defaultNow(),
}, (table) => [
  index("idx_tenant_users_tenant").on(table.tenantId),
  index("idx_tenant_users_user").on(table.userId),
]);

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  password: varchar("password"), // For local authentication
  globalRole: varchar("global_role", { length: 20 }).default('user'), // user, admin, superadmin
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_conversations_tenant").on(table.tenantId),
  index("idx_conversations_user").on(table.userId),
]);

// Messages table
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  conversationId: uuid("conversation_id").references(() => conversations.id).notNull(),
  role: varchar("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional data like voice transcription, etc.
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_messages_tenant").on(table.tenantId),
  index("idx_messages_conversation").on(table.conversationId),
]);

// Tasks table
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  priority: varchar("priority").notNull().default('medium'), // 'low', 'medium', 'high'
  status: varchar("status").notNull().default('pending'), // 'pending', 'in_progress', 'completed'
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_tasks_tenant").on(table.tenantId),
  index("idx_tasks_user").on(table.userId),
]);

// Health tracking table
export const healthEntries = pgTable("health_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: timestamp("date").notNull(),
  sleepHours: real("sleep_hours"),
  steps: integer("steps"),
  weight: real("weight"),
  mood: integer("mood"), // 1-10 scale
  energy: integer("energy"), // 1-10 scale
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_health_entries_tenant").on(table.tenantId),
  index("idx_health_entries_user").on(table.userId),
]);

// Financial tracking table
export const financialEntries = pgTable("financial_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: varchar("type").notNull(), // 'income', 'expense'
  category: varchar("category").notNull(),
  amount: real("amount").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_financial_entries_tenant").on(table.tenantId),
  index("idx_financial_entries_user").on(table.userId),
]);

// Mood tracking table
export const moodEntries = pgTable("mood_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  mood: integer("mood").notNull(), // 1-10 scale
  energy: integer("energy"), // 1-10 scale
  stress: integer("stress"), // 1-10 scale
  notes: text("notes"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_mood_entries_tenant").on(table.tenantId),
  index("idx_mood_entries_user").on(table.userId),
]);

// Journal entries table
export const journalEntries = pgTable("journal_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title"),
  content: text("content").notNull(),
  mood: integer("mood"), // 1-10 scale
  aiInsights: text("ai_insights"), // AI-generated insights
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_journal_entries_tenant").on(table.tenantId),
  index("idx_journal_entries_user").on(table.userId),
]);

// User preferences table
export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  theme: varchar("theme").default('dark'),
  voiceEnabled: boolean("voice_enabled").default(true),
  notifications: jsonb("notifications").default({}),
  aiPersonality: varchar("ai_personality").default('helpful'),
  timezone: varchar("timezone").default('UTC'),
  language: varchar("language").default('en'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_user_preferences_tenant").on(table.tenantId),
  index("idx_user_preferences_user").on(table.userId),
]);

// AI Provider configurations table (tenant-specific)
export const providerConfigurations = pgTable("provider_configurations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  providerName: varchar("provider_name", { length: 50 }).notNull(), // openai, claude, gemini, etc.
  displayName: varchar("display_name", { length: 255 }).notNull(),
  apiKey: text("api_key"), // Encrypted API key
  isEnabled: boolean("is_enabled").default(false),
  priority: integer("priority").default(1),
  configuration: jsonb("configuration").default({}), // Provider-specific settings
  lastTestResult: jsonb("last_test_result"), // Last connection test results
  lastTestedAt: timestamp("last_tested_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_provider_configurations_tenant").on(table.tenantId),
  index("idx_provider_configurations_provider").on(table.providerName),
  index("idx_provider_configurations_tenant_provider").on(table.tenantId, table.providerName),
]);

// AI Provider test history table
export const providerTestHistory = pgTable("provider_test_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }).notNull(),
  providerConfigurationId: uuid("provider_configuration_id").references(() => providerConfigurations.id, { onDelete: "cascade" }).notNull(),
  testType: varchar("test_type", { length: 50 }).notNull(), // connection, model_list, generation, etc.
  success: boolean("success").notNull(),
  responseTime: integer("response_time"), // milliseconds
  errorMessage: text("error_message"),
  testData: jsonb("test_data"), // Test input/output data
  metadata: jsonb("metadata"), // Additional test metadata
  testedAt: timestamp("tested_at").defaultNow(),
}, (table) => [
  index("idx_provider_test_history_tenant").on(table.tenantId),
  index("idx_provider_test_history_config").on(table.providerConfigurationId),
  index("idx_provider_test_history_tested_at").on(table.testedAt),
]);

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  tenantUsers: many(tenantUsers),
  conversations: many(conversations),
  tasks: many(tasks),
  healthEntries: many(healthEntries),
  financialEntries: many(financialEntries),
  moodEntries: many(moodEntries),
  journalEntries: many(journalEntries),
  userPreferences: many(userPreferences),
  providerConfigurations: many(providerConfigurations),
  providerTestHistory: many(providerTestHistory),
}));

export const tenantUsersRelations = relations(tenantUsers, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantUsers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantUsers.userId], references: [users.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  tenantUsers: many(tenantUsers),
  conversations: many(conversations),
  tasks: many(tasks),
  healthEntries: many(healthEntries),
  financialEntries: many(financialEntries),
  moodEntries: many(moodEntries),
  journalEntries: many(journalEntries),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [conversations.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [conversations.userId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, { fields: [messages.tenantId], references: [tenants.id] }),
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  tenant: one(tenants, { fields: [tasks.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
}));

export const healthEntriesRelations = relations(healthEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [healthEntries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [healthEntries.userId], references: [users.id] }),
}));

export const financialEntriesRelations = relations(financialEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [financialEntries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [financialEntries.userId], references: [users.id] }),
}));

export const moodEntriesRelations = relations(moodEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [moodEntries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [moodEntries.userId], references: [users.id] }),
}));

export const journalEntriesRelations = relations(journalEntries, ({ one }) => ({
  tenant: one(tenants, { fields: [journalEntries.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [journalEntries.userId], references: [users.id] }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  tenant: one(tenants, { fields: [userPreferences.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [userPreferences.userId], references: [users.id] }),
}));

export const providerConfigurationsRelations = relations(providerConfigurations, ({ one, many }) => ({
  tenant: one(tenants, { fields: [providerConfigurations.tenantId], references: [tenants.id] }),
  testHistory: many(providerTestHistory),
}));

export const providerTestHistoryRelations = relations(providerTestHistory, ({ one }) => ({
  tenant: one(tenants, { fields: [providerTestHistory.tenantId], references: [tenants.id] }),
  providerConfiguration: one(providerConfigurations, { fields: [providerTestHistory.providerConfigurationId], references: [providerConfigurations.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertTenantSchema = createInsertSchema(tenants);
export const insertTenantUserSchema = createInsertSchema(tenantUsers);
export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertTaskSchema = createInsertSchema(tasks);
export const insertHealthEntrySchema = createInsertSchema(healthEntries);
export const insertFinancialEntrySchema = createInsertSchema(financialEntries);
export const insertMoodEntrySchema = createInsertSchema(moodEntries);
export const insertJournalEntrySchema = createInsertSchema(journalEntries);
export const insertUserPreferencesSchema = createInsertSchema(userPreferences);
export const insertProviderConfigurationSchema = createInsertSchema(providerConfigurations);
export const insertProviderTestHistorySchema = createInsertSchema(providerTestHistory);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;
export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
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
export type ProviderConfiguration = typeof providerConfigurations.$inferSelect;
export type InsertProviderConfiguration = z.infer<typeof insertProviderConfigurationSchema>;
export type ProviderTestHistory = typeof providerTestHistory.$inferSelect;
export type InsertProviderTestHistory = z.infer<typeof insertProviderTestHistorySchema>;

// Multi-tenant specific types
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';
export type TenantStatus = 'active' | 'suspended' | 'inactive';
export type TenantPlan = 'free' | 'basic' | 'pro' | 'enterprise';

// Global role types
export type GlobalRole = 'user' | 'admin' | 'superadmin';

// AI Provider specific types
export type ProviderName = 'openai' | 'claude' | 'gemini' | 'local_llm' | 'mock';
export type TestType = 'connection' | 'model_list' | 'generation' | 'health_check';

export interface ProviderTestResult {
  success: boolean;
  responseTime?: number;
  errorMessage?: string;
  errorType?: string;
  data?: any;
  timestamp: Date;
}

export interface ProviderConfigurationWithTests extends ProviderConfiguration {
  testHistory?: ProviderTestHistory[];
  isHealthy?: boolean;
}

export interface TenantMembership {
  tenant: Tenant;
  role: TenantRole;
  status: string;
  joinedAt: Date | null;
}

export interface AuthenticatedUser extends User {
  currentTenant?: {
    id: string;
    name: string;
    slug: string;
    role: TenantRole;
  };
  availableTenants?: TenantMembership[];
}
