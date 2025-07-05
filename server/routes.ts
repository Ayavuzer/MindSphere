import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { aiService } from "./services/UnifiedAIService";
import { z } from "zod";
import { insertTaskSchema, insertHealthEntrySchema, insertFinancialEntrySchema, insertMoodEntrySchema, insertJournalEntrySchema, insertUserPreferencesSchema } from "@shared/schema";
import { HealthData, MoodData, TaskData } from "./services/base/IAIProvider";
import { tenantResolver } from "./utils/tenant-resolver";
import { requireSuperAdmin, requireAdmin } from "./middleware/roleMiddleware";

// Helper functions to convert database objects to AI service types
function convertHealthData(dbHealthData: any[]): HealthData[] {
  return dbHealthData.map(entry => ({
    date: entry.date,
    sleepHours: entry.sleepHours || undefined,
    steps: entry.steps || undefined,
    weight: entry.weight || undefined,
    mood: entry.mood || 5,
    energy: entry.energy || 5,
    notes: entry.notes || undefined
  }));
}

function convertMoodData(dbMoodData: any[]): MoodData[] {
  return dbMoodData.map(entry => ({
    date: entry.date,
    mood: entry.mood,
    energy: entry.energy || 5,
    stress: entry.stress || 5,
    notes: entry.notes || undefined
  }));
}

function convertTaskData(dbTaskData: any[]): TaskData[] {
  return dbTaskData.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description || undefined,
    priority: task.priority as 'low' | 'medium' | 'high',
    status: task.status as 'pending' | 'in_progress' | 'completed',
    dueDate: task.dueDate || undefined,
    tags: task.tags || undefined
  }));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize AI service
  try {
    await aiService.initialize();
    console.log('🤖 AI Service initialized successfully');
  } catch (error) {
    console.warn('⚠️  AI Service initialization failed:', error);
  }

  // Auth middleware
  await setupAuth(app);
  
  // Tenant resolution middleware
  app.use('/api/*', isAuthenticated, async (req: any, res, next) => {
    try {
      console.log('Tenant resolution for:', req.path);
      console.log('Headers:', req.headers);
      console.log('User:', req.user?.id);
      
      const tenantId = await tenantResolver.resolveTenantId(req);
      console.log('Resolved tenant ID:', tenantId);
      
      if (!tenantId) {
        console.error('No tenant context available for user:', req.user?.id);
        return res.status(400).json({ message: "No tenant context available" });
      }
      
      // Add tenant context to request
      const userRole = await tenantResolver.getUserTenantRole(req.user.id, tenantId);
      req.tenant = {
        id: tenantId,
        role: userRole || 'member'
      };
      
      console.log('Tenant context set:', req.tenant);
      next();
    } catch (error) {
      console.error('Tenant resolution error:', error);
      res.status(500).json({ message: 'Failed to resolve tenant context' });
    }
  });

  // Auth routes are now handled in auth.ts

  // Conversation routes
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const conversations = await storage.getConversations(tenantId, userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const conversation = await storage.createConversation({
        userId,
        tenantId,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const { id } = req.params;
      
      // Verify conversation belongs to user and tenant
      const conversation = await storage.getConversation(id, tenantId, userId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }

      const messages = await storage.getMessages(id, tenantId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      console.log('💬 CHAT MESSAGE REQUEST RECEIVED:', {
        userId: req.user?.id,
        conversationId: req.params.id,
        tenantId: req.tenant?.id,
        body: {
          content: req.body?.content?.substring(0, 100) || 'no content',
          preferredProvider: req.body?.preferredProvider,
          preferredModel: req.body?.preferredModel
        }
      });
      
      const userId = req.user.id;
      const { id } = req.params;
      const { content, preferredProvider, preferredModel } = req.body;

      // Verify conversation belongs to user and tenant
      const tenantId = req.tenant.id;
      const conversation = await storage.getConversation(id, tenantId, userId);
      if (!conversation) {
        console.error('❌ Conversation not found:', { id, tenantId, userId });
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      console.log('✅ Conversation found, proceeding with message creation...');

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId: id,
        tenantId,
        role: 'user',
        content,
      });

      // Get conversation history for context
      const messages = await storage.getMessages(id, tenantId);
      const user = await storage.getUser(userId);

      // Generate AI response
      console.log('🤖 Generating AI response with provider:', preferredProvider, 'model:', preferredModel);
      console.log('🤖 Message context:', {
        userId,
        messageCount: messages.length,
        userProfile: { name: user?.firstName || 'User' }
      });
      
      console.log('🤖 Calling aiService.generateResponse...');
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
        model: preferredModel,
      }, preferredProvider);
      
      console.log('✅ AI response generated successfully:', {
        hasContent: !!aiResponse?.content,
        contentLength: aiResponse?.content?.length || 0,
        provider: aiResponse?.metadata?.provider || 'unknown',
        usage: aiResponse?.usage
      });

      // Create AI message
      const aiMessage = await storage.createMessage({
        conversationId: id,
        tenantId,
        role: 'assistant',
        content: aiResponse.content,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const tasks = await storage.getTasks(tenantId, userId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const taskData = insertTaskSchema.parse({ ...req.body, userId, tenantId });
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
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const healthEntries = await storage.getHealthEntries(
        req.tenant.id,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const entryData = insertHealthEntrySchema.parse({ ...req.body, userId, tenantId });
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
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const financialEntries = await storage.getFinancialEntries(
        req.tenant.id,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const entryData = insertFinancialEntrySchema.parse({ ...req.body, userId, tenantId });
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
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const moodEntries = await storage.getMoodEntries(
        req.tenant.id,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const entryData = insertMoodEntrySchema.parse({ ...req.body, userId, tenantId });
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
      const userId = req.user.id;
      const { startDate, endDate } = req.query;
      
      const journalEntries = await storage.getJournalEntries(
        req.tenant.id,
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
      const userId = req.user.id;
      const { content, title, mood } = req.body;
      
      // Generate AI insights for the journal entry
      const aiInsights = await aiService.generateJournalInsights(content);
      
      const entryData = insertJournalEntrySchema.parse({
        userId,
        tenantId: req.tenant.id,
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
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const stats = await storage.getUserStats(tenantId, userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get('/api/analytics/insights', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { type } = req.query;
      
      let insights = "";
      
      if (type === 'health') {
        const healthData = await storage.getHealthEntries(req.tenant.id, userId);
        const convertedHealthData = convertHealthData(healthData);
        insights = await aiService.generateHealthInsights(convertedHealthData);
      } else if (type === 'mood') {
        const moodData = await storage.getMoodEntries(req.tenant.id, userId);
        const convertedMoodData = convertMoodData(moodData);
        insights = await aiService.generateMoodInsights(convertedMoodData);
      } else if (type === 'tasks') {
        const tasks = await storage.getTasks(req.tenant.id, userId);
        const convertedTasks = convertTaskData(tasks);
        const result = await aiService.generateTaskPrioritization(convertedTasks);
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

  // User Preferences routes
  app.get('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const preferences = await storage.getUserPreferences(tenantId, userId);
      
      if (!preferences) {
        // Return default preferences if none exist
        const defaultPreferences = {
          userId,
          tenantId,
          theme: 'dark',
          voiceEnabled: true,
          notifications: {},
          aiPersonality: 'helpful',
          timezone: 'UTC',
          language: 'en',
        };
        res.json(defaultPreferences);
      } else {
        res.json(preferences);
      }
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch user preferences" });
    }
  });

  app.post('/api/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenantId = req.tenant.id;
      const preferencesData = insertUserPreferencesSchema.parse({ ...req.body, userId, tenantId });
      const preferences = await storage.upsertUserPreferences(preferencesData);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(500).json({ message: "Failed to update user preferences" });
    }
  });

  // Configuration validation routes
  app.get('/api/config/status', isAuthenticated, async (_req: any, res) => {
    try {
      const status = {
        openaiConfigured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
        databaseConnected: true, // If we got here, DB is connected
        sessionConfigured: !!(process.env.SESSION_SECRET && process.env.SESSION_SECRET !== 'your-super-secret-session-key-change-this-in-production'),
      };
      res.json(status);
    } catch (error) {
      console.error("Error checking config status:", error);
      res.status(500).json({ message: "Failed to check configuration status" });
    }
  });

  // Tenant Management routes
  app.get('/api/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tenants = await storage.getUserTenants(userId);
      res.json(tenants);
    } catch (error) {
      console.error("Error fetching user tenants:", error);
      res.status(500).json({ message: "Failed to fetch tenants" });
    }
  });

  app.get('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user has access to this tenant
      const hasAccess = await storage.userHasTenantAccess(userId, id);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const tenant = await storage.getTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error("Error fetching tenant:", error);
      res.status(500).json({ message: "Failed to fetch tenant" });
    }
  });

  app.post('/api/tenants', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, slug } = req.body;
      
      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }
      
      // Check if slug is already taken
      const existingTenant = await storage.getTenantBySlug(slug);
      if (existingTenant) {
        return res.status(409).json({ message: "Slug already taken" });
      }
      
      // Create tenant
      const tenant = await storage.createTenant({
        name,
        slug,
        settings: {},
        plan: 'free',
        status: 'active'
      });
      
      // Add user as owner
      await storage.addUserToTenant({
        tenantId: tenant.id,
        userId,
        role: 'owner',
        status: 'active'
      });
      
      res.status(201).json(tenant);
    } catch (error) {
      console.error("Error creating tenant:", error);
      res.status(500).json({ message: "Failed to create tenant" });
    }
  });

  app.patch('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user is admin or owner
      const hasAccess = await tenantResolver.validateTenantAccess(userId, id, 'admin');
      if (!hasAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const updates = req.body;
      const tenant = await storage.updateTenant(id, updates);
      res.json(tenant);
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ message: "Failed to update tenant" });
    }
  });

  app.delete('/api/tenants/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Check if user is owner
      const hasAccess = await tenantResolver.validateTenantAccess(userId, id, 'owner');
      if (!hasAccess) {
        return res.status(403).json({ message: "Owner access required" });
      }
      
      await storage.deleteTenant(id);
      res.json({ message: "Tenant deleted successfully" });
    } catch (error) {
      console.error("Error deleting tenant:", error);
      res.status(500).json({ message: "Failed to delete tenant" });
    }
  });

  // Tenant User Management routes
  app.post('/api/tenants/:id/users', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { email, role = 'member' } = req.body;
      
      // Check if user is admin or owner
      const hasAccess = await tenantResolver.validateTenantAccess(userId, id, 'admin');
      if (!hasAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Find user by email
      const targetUser = await storage.getUserByEmail(email);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user is already in tenant
      const existingMembership = await storage.getTenantMembership(id, targetUser.id);
      if (existingMembership) {
        return res.status(409).json({ message: "User already in tenant" });
      }
      
      // Add user to tenant
      const membership = await storage.addUserToTenant({
        tenantId: id,
        userId: targetUser.id,
        role,
        status: 'active'
      });
      
      res.status(201).json(membership);
    } catch (error) {
      console.error("Error adding user to tenant:", error);
      res.status(500).json({ message: "Failed to add user to tenant" });
    }
  });

  app.patch('/api/tenants/:id/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const { id, userId: targetUserId } = req.params;
      const userId = req.user.id;
      const { role } = req.body;
      
      // Check if user is admin or owner
      const hasAccess = await tenantResolver.validateTenantAccess(userId, id, 'admin');
      if (!hasAccess) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const membership = await storage.updateTenantUserRole(id, targetUserId, role);
      res.json(membership);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/tenants/:id/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { id, userId: targetUserId } = req.params;
      const userId = req.user.id;
      
      // Check if user is admin or owner, or removing themselves
      const hasAccess = await tenantResolver.validateTenantAccess(userId, id, 'admin') || userId === targetUserId;
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.removeUserFromTenant(id, targetUserId);
      res.json({ message: "User removed from tenant" });
    } catch (error) {
      console.error("Error removing user from tenant:", error);
      res.status(500).json({ message: "Failed to remove user from tenant" });
    }
  });

  // AI Provider Management routes
  app.get('/api/ai/providers', isAuthenticated, async (_req: any, res) => {
    try {
      const providers = await aiService.getAvailableProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching AI providers:", error);
      res.status(500).json({ message: "Failed to fetch AI providers" });
    }
  });

  app.get('/api/ai/providers/:providerName/models', isAuthenticated, async (req: any, res) => {
    try {
      const { providerName } = req.params;
      const models = await aiService.getProviderModels(providerName);
      res.json(models);
    } catch (error) {
      console.error(`Error fetching models for provider ${req.params.providerName}:`, error);
      res.status(500).json({ message: `Failed to fetch models for provider ${req.params.providerName}` });
    }
  });

  app.get('/api/ai/health', isAuthenticated, async (_req: any, res) => {
    try {
      const healthStatus = await aiService.getProviderHealth();
      const healthArray = Array.from(healthStatus.entries()).map(([name, healthy]) => ({
        provider: name,
        healthy
      }));
      res.json(healthArray);
    } catch (error) {
      console.error("Error checking AI provider health:", error);
      res.status(500).json({ message: "Failed to check AI provider health" });
    }
  });

  app.post('/api/ai/providers/:providerName/priority', isAuthenticated, async (req: any, res) => {
    try {
      const { providerName } = req.params;
      const { priority } = req.body;
      
      await aiService.setProviderPriority(providerName, priority);
      res.json({ message: `Provider ${providerName} priority updated to ${priority}` });
    } catch (error) {
      console.error("Error updating provider priority:", error);
      res.status(500).json({ message: "Failed to update provider priority" });
    }
  });

  app.put('/api/ai/providers/:providerName/api-key', isAuthenticated, async (req: any, res) => {
    try {
      const { providerName } = req.params;
      const { apiKey } = req.body;
      
      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ message: "API key is required" });
      }
      
      await aiService.updateProviderConfig(providerName, { apiKey, isEnabled: true });
      res.json({ message: `Provider ${providerName} API key updated successfully` });
    } catch (error) {
      console.error("Error updating provider API key:", error);
      res.status(500).json({ message: "Failed to update provider API key" });
    }
  });

  // Superadmin routes for user management
  app.get('/api/admin/users', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      
      // Remove sensitive information
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        globalRole: user.globalRole || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:userId/role', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { globalRole } = req.body;

      if (!['user', 'admin', 'superadmin'].includes(globalRole)) {
        return res.status(400).json({ message: "Invalid role specified" });
      }

      // Prevent user from removing their own superadmin role
      if (req.user.id === userId && globalRole !== 'superadmin') {
        return res.status(400).json({ message: "Cannot remove your own superadmin privileges" });
      }

      const updatedUser = await storage.updateUserRole(userId, globalRole);
      
      res.json({
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        globalRole: updatedUser.globalRole,
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete('/api/admin/users/:userId', isAuthenticated, requireSuperAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      // Prevent user from deleting themselves
      if (req.user.id === userId) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await storage.deleteUser(userId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/admin/stats', isAuthenticated, requireSuperAdmin, async (_req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      const totalUsers = users.length;
      const adminUsers = users.filter(u => u.globalRole === 'admin').length;
      const superAdminUsers = users.filter(u => u.globalRole === 'superadmin').length;
      const regularUsers = users.filter(u => !u.globalRole || u.globalRole === 'user').length;

      res.json({
        totalUsers,
        adminUsers,
        superAdminUsers,
        regularUsers,
        userGrowth: {
          thisMonth: users.filter(u => 
            u.createdAt && new Date(u.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length,
          lastMonth: users.filter(u => 
            u.createdAt && 
            new Date(u.createdAt) > new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) &&
            new Date(u.createdAt) <= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          ).length,
        }
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  // Debug route for AI service status (bypass auth for testing)
  app.get('/api/debug/ai-status', async (_req: any, res) => {
    try {
      const enabledProviders = await aiService.getAvailableProviders();
      const healthStatus = await aiService.getProviderHealth();
      
      const debugInfo = {
        aiServiceInitialized: true,
        enabledProviders: enabledProviders.filter(p => p.isEnabled),
        allProviders: enabledProviders,
        healthStatus: Array.from(healthStatus.entries()).map(([name, healthy]) => ({ name, healthy })),
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString()
      };
      
      console.log('🔍 AI Debug Status:', debugInfo);
      res.json(debugInfo);
    } catch (error) {
      console.error('Error getting AI debug status:', error);
      res.status(500).json({ 
        error: 'Failed to get AI debug status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Test route for AI response (bypass auth for testing)
  app.post('/api/debug/test-ai', async (req: any, res) => {
    try {
      console.log('🧪 Testing AI response with mock provider...');
      
      const testContext = {
        userId: 'test-user',
        messages: [
          { role: 'user' as const, content: 'Hello, this is a test message' }
        ],
        userProfile: { name: 'Test User' },
        systemPrompt: 'You are a helpful assistant.'
      };
      
      console.log('🧪 Calling aiService.generateResponse...');
      const response = await aiService.generateResponse(testContext, 'mock');
      
      console.log('🧪 AI Response received:', {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        provider: response?.metadata?.provider || 'unknown'
      });
      
      res.json({
        success: true,
        response,
        testContext
      });
    } catch (error) {
      console.error('❌ Test AI error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Test route for AI response (no auth required)
  app.post('/api-test-ai', async (req: any, res) => {
    try {
      console.log('🧪 Testing AI response with mock provider...');
      
      const testContext = {
        userId: 'test-user',
        messages: [
          { role: 'user' as const, content: 'Hello, this is a test message' }
        ],
        userProfile: { name: 'Test User' },
        systemPrompt: 'You are a helpful assistant.'
      };
      
      console.log('🧪 Calling aiService.generateResponse...');
      const response = await aiService.generateResponse(testContext, 'mock');
      
      console.log('🧪 AI Response received:', {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        provider: response?.metadata?.provider || 'unknown'
      });
      
      res.json({
        success: true,
        response,
        testContext
      });
    } catch (error) {
      console.error('❌ Test AI error:', error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Health check route
  app.get('/health', async (_req, res) => {
    res.json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Quick Gemini test endpoint (no auth required)  
  app.get('/health/gemini', async (_req, res) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      
      const result = {
        apiKeyExists: !!geminiKey,
        apiKeyLength: geminiKey?.length || 0,
        apiKeyPrefix: geminiKey?.substring(0, 6) + '...' || 'none',
        isPlaceholder: geminiKey === 'your_gemini_api_key_here',
        passesSystemFilter: !!(geminiKey && geminiKey !== 'your_gemini_api_key_here' && !geminiKey?.startsWith('AIzaSyD-placeholder')),
        startsWithGeminiPrefix: geminiKey?.startsWith('AIzaSy') || false,
        timestamp: new Date().toISOString()
      };

      console.log('🧪 Quick Gemini Test:', result);
      res.json(result);
    } catch (error) {
      console.error('Gemini test error:', error);
      res.status(500).json({ error: 'Test failed' });
    }
  });

  // Gemini API Key Validator - Test if Gemini API key is valid
  app.get('/api/debug/gemini-test', async (_req: any, res) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      
      const result: any = {
        apiKeyExists: !!geminiKey,
        apiKeyLength: geminiKey?.length || 0,
        apiKeyPrefix: geminiKey?.substring(0, 10) + '...' || 'none',
        isPlaceholder: geminiKey === 'your_gemini_api_key_here' || geminiKey?.startsWith('AIzaSyD-placeholder'),
        passesFilter: !!(geminiKey && geminiKey !== 'your_gemini_api_key_here' && !geminiKey.startsWith('AIzaSyD-placeholder')),
        timestamp: new Date().toISOString()
      };

      // If we have a valid-looking key, test it directly
      if (result.passesFilter && geminiKey) {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          const genAI = new GoogleGenerativeAI(geminiKey);
          const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
          
          const testResult = await model.generateContent('Test');
          result.directApiTest = {
            success: true,
            responseReceived: !!testResult?.response?.text(),
            responseText: testResult?.response?.text()?.substring(0, 50) + '...'
          };
        } catch (apiError: any) {
          result.directApiTest = {
            success: false,
            error: apiError.message || 'Unknown API error',
            errorType: apiError.constructor.name
          };
        }
      }

      console.log('🧪 Gemini API Test Results:', result);
      res.json(result);
    } catch (error) {
      console.error('Error testing Gemini API:', error);
      res.status(500).json({ 
        error: 'Failed to test Gemini API',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Provider Configuration Inspector
  app.get('/api/debug/provider-config', async (_req: any, res) => {
    try {
      const envCheck = {
        OPENAI_API_KEY: {
          exists: !!process.env.OPENAI_API_KEY,
          isPlaceholder: process.env.OPENAI_API_KEY === 'your_openai_api_key_here',
          length: process.env.OPENAI_API_KEY?.length || 0
        },
        CLAUDE_API_KEY: {
          exists: !!process.env.CLAUDE_API_KEY,
          isPlaceholder: process.env.CLAUDE_API_KEY?.startsWith('sk-ant-api03-placeholder'),
          length: process.env.CLAUDE_API_KEY?.length || 0
        },
        GEMINI_API_KEY: {
          exists: !!process.env.GEMINI_API_KEY,
          isPlaceholder: process.env.GEMINI_API_KEY === 'your_gemini_api_key_here' || 
                        process.env.GEMINI_API_KEY?.startsWith('AIzaSyD-placeholder'),
          length: process.env.GEMINI_API_KEY?.length || 0,
          prefix: process.env.GEMINI_API_KEY?.substring(0, 6) || 'none'
        }
      };

      const availableProviders = await aiService.getAvailableProviders();
      const healthStatus = await aiService.getProviderHealth();
      
      const result = {
        environmentVariables: envCheck,
        configuredProviders: availableProviders.map(p => ({
          name: p.name,
          displayName: p.displayName,
          isEnabled: p.isEnabled,
          priority: p.priority,
          modelsCount: p.models?.length || 0,
          hasApiKey: !!p.apiKey
        })),
        healthStatus: Array.from(healthStatus.entries()).map(([name, healthy]) => ({ 
          provider: name, 
          healthy 
        })),
        timestamp: new Date().toISOString()
      };

      console.log('🔧 Provider Configuration Debug:', result);
      res.json(result);
    } catch (error) {
      console.error('Error getting provider config:', error);
      res.status(500).json({ 
        error: 'Failed to get provider configuration',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Environment Variables Checker
  app.get('/api/debug/env-check', async (_req: any, res) => {
    try {
      const result = {
        nodeEnv: process.env.NODE_ENV,
        envVarsLoaded: {
          DATABASE_URL: !!process.env.DATABASE_URL,
          OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
          CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
          GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
          OLLAMA_URL: !!process.env.OLLAMA_URL,
          SESSION_SECRET: !!process.env.SESSION_SECRET
        },
        geminiKeyDetails: {
          exists: !!process.env.GEMINI_API_KEY,
          value: process.env.GEMINI_API_KEY, // Only for debugging, remove in production
          isValid: process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' && 
                  !process.env.GEMINI_API_KEY?.startsWith('AIzaSyD-placeholder'),
          startsWithCorrectPrefix: process.env.GEMINI_API_KEY?.startsWith('AIzaSy') || false
        },
        timestamp: new Date().toISOString()
      };

      console.log('🌍 Environment Check:', result);
      res.json(result);
    } catch (error) {
      console.error('Error checking environment:', error);
      res.status(500).json({ 
        error: 'Failed to check environment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Live API Key Testing Endpoint
  app.post('/api/ai/providers/:providerName/test', async (req: any, res) => {
    try {
      const { providerName } = req.params;
      const { apiKey, testType = 'connection' } = req.body;
      const tenantId = req.tenant.id;

      if (!tenantId) {
        return res.status(400).json({ 
          success: false,
          error: 'No tenant context available',
          errorType: 'TENANT_REQUIRED'
        });
      }

      if (!apiKey) {
        return res.status(400).json({ 
          success: false,
          error: 'API key is required for testing',
          errorType: 'API_KEY_REQUIRED'
        });
      }

      console.log(`🧪 Testing ${providerName} API key for tenant ${tenantId}`);
      const startTime = Date.now();
      
      let testResult = {
        success: false,
        responseTime: 0,
        errorMessage: '',
        errorType: '',
        data: null as any,
        timestamp: new Date(),
        retryCount: 0
      };

      // Retry logic for rate limits
      const maxRetries = 3;
      const retryDelays = [1000, 2000, 4000]; // 1s, 2s, 4s
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          testResult.retryCount = attempt;
          
          if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt} for ${providerName} after ${retryDelays[attempt-1]}ms delay`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt-1]));
          }

          // Provider-specific testing logic
          switch (providerName.toLowerCase()) {
          case 'openai':
            const { OpenAI } = await import('openai');
            const openaiClient = new OpenAI({ apiKey });
            
            if (testType === 'model_list') {
              const models = await openaiClient.models.list();
              testResult.data = { 
                modelCount: models.data.length,
                models: models.data.slice(0, 5).map(m => m.id)
              };
            } else {
              // Simple connection test
              const completion = await openaiClient.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
              });
              testResult.data = { 
                response: completion.choices[0]?.message?.content?.substring(0, 50),
                model: completion.model,
                usage: completion.usage
              };
            }
            break;

          case 'claude':
            const { Anthropic } = await import('@anthropic-ai/sdk');
            const claudeClient = new Anthropic({ apiKey });
            
            if (testType === 'model_list') {
              // Claude doesn't have a models endpoint, so we'll test with a simple message
              const message = await claudeClient.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Hello' }]
              });
              testResult.data = { 
                response: message.content[0]?.type === 'text' ? message.content[0].text?.substring(0, 50) : '',
                model: message.model,
                usage: message.usage
              };
            } else {
              const message = await claudeClient.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Hello' }]
              });
              testResult.data = { 
                response: message.content[0]?.type === 'text' ? message.content[0].text?.substring(0, 50) : '',
                model: message.model,
                usage: message.usage
              };
            }
            break;

          case 'gemini':
            const { GoogleGenerativeAI } = await import('@google/generative-ai');
            const geminiClient = new GoogleGenerativeAI(apiKey);
            
            if (testType === 'model_list') {
              const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
              const result = await model.generateContent('Hello');
              testResult.data = { 
                response: result.response.text()?.substring(0, 50),
                model: 'gemini-1.5-flash'
              };
            } else {
              const model = geminiClient.getGenerativeModel({ model: 'gemini-1.5-flash' });
              const result = await model.generateContent('Hello');
              testResult.data = { 
                response: result.response.text()?.substring(0, 50),
                model: 'gemini-1.5-flash'
              };
            }
            break;

          default:
            return res.status(400).json({
              success: false,
              error: `Provider "${providerName}" is not supported for testing`,
              errorType: 'UNSUPPORTED_PROVIDER'
            });
        }

          testResult.success = true;
          testResult.responseTime = Date.now() - startTime;
          break; // Success, exit retry loop

        } catch (error: any) {
          testResult.success = false;
          testResult.responseTime = Date.now() - startTime;
          testResult.errorMessage = error.message || 'Unknown error occurred';
          
          // Enhanced error categorization with specific provider patterns
          if (error.status === 401 || 
              error.message?.includes('authentication') || 
              error.message?.includes('API key') ||
              error.message?.includes('invalid x-api-key') ||
              error.message?.includes('API key not valid') ||
              error.message?.includes('Incorrect API key')) {
            testResult.errorType = 'AUTHENTICATION_ERROR';
            
            // Provider-specific error messages
            if (providerName.toLowerCase() === 'gemini' && error.message?.includes('API key not valid')) {
              testResult.errorMessage = 'Invalid Gemini API key. Please verify your key starts with "AIzaSy" and is exactly 39 characters long.';
            } else if (providerName.toLowerCase() === 'openai' && error.message?.includes('Incorrect API key')) {
              testResult.errorMessage = 'Invalid OpenAI API key. Please verify your key starts with "sk-" and is from your OpenAI dashboard.';
            } else if (providerName.toLowerCase() === 'claude' && error.message?.includes('invalid x-api-key')) {
              testResult.errorMessage = 'Invalid Claude API key. Please verify your key starts with "sk-ant-" and is from your Anthropic console.';
            }
            break; // Don't retry auth errors
          } else if (error.status === 429 || error.message?.includes('rate limit') || error.message?.includes('quota')) {
            testResult.errorType = 'RATE_LIMIT_ERROR';
            
            // Retry rate limit errors
            if (attempt < maxRetries) {
              console.log(`🕐 Rate limit hit, will retry in ${retryDelays[attempt]}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
              continue; // Try again
            } else {
              testResult.errorMessage = `Rate limit exceeded after ${maxRetries + 1} attempts. Please wait a moment and try again.`;
            }
          } else if (error.status >= 500 || error.message?.includes('server') || error.message?.includes('timeout')) {
            testResult.errorType = 'SERVER_ERROR';
            
            // Retry server errors
            if (attempt < maxRetries) {
              console.log(`🔄 Server error, will retry in ${retryDelays[attempt]}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
              continue; // Try again
            }
          } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
            testResult.errorType = 'NETWORK_ERROR';
            
            // Retry network errors
            if (attempt < maxRetries) {
              console.log(`🌐 Network error, will retry in ${retryDelays[attempt]}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
              continue; // Try again
            }
          } else {
            testResult.errorType = 'UNKNOWN_ERROR';
            break; // Don't retry unknown errors
          }
        }
      }

      console.log(`🧪 Test result for ${providerName}:`, {
        success: testResult.success,
        responseTime: testResult.responseTime,
        errorType: testResult.errorType
      });

      res.json(testResult);

    } catch (error) {
      console.error(`Error testing ${req.params.providerName} API:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to test API key',
        errorType: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
