import {
  users,
  tenants,
  tenantUsers,
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
  type Tenant,
  type InsertTenant,
  type TenantUser,
  type InsertTenantUser,
  type TenantMembership,
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
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, globalRole: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  
  // Tenant operations
  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  
  // Tenant user operations
  getTenantMembership(tenantId: string, userId: string): Promise<TenantUser | undefined>;
  getUserTenants(userId: string): Promise<TenantMembership[]>;
  addUserToTenant(membership: InsertTenantUser): Promise<TenantUser>;
  updateTenantUserRole(tenantId: string, userId: string, role: string): Promise<TenantUser>;
  removeUserFromTenant(tenantId: string, userId: string): Promise<void>;
  userHasTenantAccess(userId: string, tenantId: string): Promise<boolean>;
  
  // Conversation operations
  getConversations(tenantId: string, userId?: string): Promise<Conversation[]>;
  getConversation(id: string, tenantId: string, userId?: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<Conversation>;
  
  // Message operations
  getMessages(conversationId: string, tenantId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Task operations
  getTasks(tenantId: string, userId?: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Health operations
  getHealthEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<HealthEntry[]>;
  createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry>;
  getLatestHealthEntry(tenantId: string, userId: string): Promise<HealthEntry | undefined>;
  
  // Financial operations
  getFinancialEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<FinancialEntry[]>;
  createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry>;
  
  // Mood operations
  getMoodEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]>;
  createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry>;
  getLatestMoodEntry(tenantId: string, userId: string): Promise<MoodEntry | undefined>;
  
  // Journal operations
  getJournalEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<JournalEntry[]>;
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  
  // User preferences
  getUserPreferences(tenantId: string, userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences): Promise<UserPreferences>;
  
  // Analytics
  getUserStats(tenantId: string, userId?: string): Promise<{
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, globalRole: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ globalRole, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete user cascades will handle related data
    await db.delete(users).where(eq(users.id, userId));
  }

  // Tenant operations
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values(tenantData)
      .returning();
    return tenant;
  }

  async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: string): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  // Tenant user operations
  async getTenantMembership(tenantId: string, userId: string): Promise<TenantUser | undefined> {
    const [membership] = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));
    return membership;
  }

  async getUserTenants(userId: string): Promise<TenantMembership[]> {
    const results = await db
      .select({
        tenant: tenants,
        role: tenantUsers.role,
        status: tenantUsers.status,
        joinedAt: tenantUsers.joinedAt,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(and(eq(tenantUsers.userId, userId), eq(tenantUsers.status, 'active')))
      .orderBy(tenantUsers.joinedAt);

    return results.map(result => ({
      tenant: result.tenant,
      role: result.role as any,
      status: result.status || 'active',
      joinedAt: result.joinedAt,
    }));
  }

  async addUserToTenant(membershipData: InsertTenantUser): Promise<TenantUser> {
    const [membership] = await db
      .insert(tenantUsers)
      .values(membershipData)
      .returning();
    return membership;
  }

  async updateTenantUserRole(tenantId: string, userId: string, role: string): Promise<TenantUser> {
    const [updatedMembership] = await db
      .update(tenantUsers)
      .set({ role })
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .returning();
    return updatedMembership;
  }

  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    await db
      .delete(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)));
  }

  async userHasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
    const [membership] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.status, 'active')
      ))
      .limit(1);
    return !!membership;
  }

  // Conversation operations
  async getConversations(tenantId: string, userId?: string): Promise<Conversation[]> {
    let whereClause = eq(conversations.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(conversations.userId, userId))!;
    }

    return await db
      .select()
      .from(conversations)
      .where(whereClause)
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string, tenantId: string, userId?: string): Promise<Conversation | undefined> {
    let whereClause = and(eq(conversations.id, id), eq(conversations.tenantId, tenantId));
    
    if (userId) {
      whereClause = and(whereClause, eq(conversations.userId, userId));
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(whereClause);
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
  async getMessages(conversationId: string, tenantId: string): Promise<Message[]> {
    // Note: tenantId is validated through conversation ownership
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
  async getTasks(tenantId: string, userId?: string): Promise<Task[]> {
    let whereClause = eq(tasks.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(tasks.userId, userId))!;
    }
    
    return await db
      .select()
      .from(tasks)
      .where(whereClause)
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
  async getHealthEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<HealthEntry[]> {
    let whereClause = eq(healthEntries.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(healthEntries.userId, userId))!;
    }
    
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        gte(healthEntries.date, startDate),
        lte(healthEntries.date, endDate)
      )!;
    }
    
    return await db
      .select()
      .from(healthEntries)
      .where(whereClause)
      .orderBy(desc(healthEntries.date));
  }

  async createHealthEntry(entry: InsertHealthEntry): Promise<HealthEntry> {
    const [newEntry] = await db
      .insert(healthEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getLatestHealthEntry(tenantId: string, userId: string): Promise<HealthEntry | undefined> {
    const [entry] = await db
      .select()
      .from(healthEntries)
      .where(and(eq(healthEntries.tenantId, tenantId), eq(healthEntries.userId, userId)))
      .orderBy(desc(healthEntries.date))
      .limit(1);
    return entry;
  }

  // Financial operations
  async getFinancialEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<FinancialEntry[]> {
    let whereClause = eq(financialEntries.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(financialEntries.userId, userId))!;
    }
    
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        gte(financialEntries.date, startDate),
        lte(financialEntries.date, endDate)
      )!;
    }
    
    return await db
      .select()
      .from(financialEntries)
      .where(whereClause)
      .orderBy(desc(financialEntries.date));
  }

  async createFinancialEntry(entry: InsertFinancialEntry): Promise<FinancialEntry> {
    const [newEntry] = await db
      .insert(financialEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  // Mood operations
  async getMoodEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<MoodEntry[]> {
    let whereClause = eq(moodEntries.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(moodEntries.userId, userId))!;
    }
    
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        gte(moodEntries.date, startDate),
        lte(moodEntries.date, endDate)
      )!;
    }
    
    return await db
      .select()
      .from(moodEntries)
      .where(whereClause)
      .orderBy(desc(moodEntries.date));
  }

  async createMoodEntry(entry: InsertMoodEntry): Promise<MoodEntry> {
    const [newEntry] = await db
      .insert(moodEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getLatestMoodEntry(tenantId: string, userId: string): Promise<MoodEntry | undefined> {
    const [entry] = await db
      .select()
      .from(moodEntries)
      .where(and(eq(moodEntries.tenantId, tenantId), eq(moodEntries.userId, userId)))
      .orderBy(desc(moodEntries.date))
      .limit(1);
    return entry;
  }

  // Journal operations
  async getJournalEntries(tenantId: string, userId?: string, startDate?: Date, endDate?: Date): Promise<JournalEntry[]> {
    let whereClause = eq(journalEntries.tenantId, tenantId);
    
    if (userId) {
      whereClause = and(whereClause, eq(journalEntries.userId, userId))!;
    }
    
    if (startDate && endDate) {
      whereClause = and(
        whereClause,
        gte(journalEntries.date, startDate),
        lte(journalEntries.date, endDate)
      )!;
    }
    
    return await db
      .select()
      .from(journalEntries)
      .where(whereClause)
      .orderBy(desc(journalEntries.date));
  }

  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  // User preferences
  async getUserPreferences(tenantId: string, userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(and(eq(userPreferences.tenantId, tenantId), eq(userPreferences.userId, userId)));
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
  async getUserStats(tenantId: string, userId?: string): Promise<{
    totalTasks: number;
    completedTasks: number;
    avgMood: number;
    avgEnergy: number;
    totalConversations: number;
  }> {
    let taskWhereClause = eq(tasks.tenantId, tenantId);
    let moodWhereClause = eq(moodEntries.tenantId, tenantId);
    let convWhereClause = eq(conversations.tenantId, tenantId);
    
    if (userId) {
      taskWhereClause = and(taskWhereClause, eq(tasks.userId, userId))!;
      moodWhereClause = and(moodWhereClause, eq(moodEntries.userId, userId))!;
      convWhereClause = and(convWhereClause, eq(conversations.userId, userId))!;
    }

    const [taskStats] = await db
      .select({
        totalTasks: sql<number>`count(*)`,
        completedTasks: sql<number>`count(case when status = 'completed' then 1 end)`,
      })
      .from(tasks)
      .where(taskWhereClause);

    const [moodStats] = await db
      .select({
        avgMood: sql<number>`avg(mood)`,
        avgEnergy: sql<number>`avg(energy)`,
      })
      .from(moodEntries)
      .where(moodWhereClause);

    const [convStats] = await db
      .select({
        totalConversations: sql<number>`count(*)`,
      })
      .from(conversations)
      .where(convWhereClause);

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
