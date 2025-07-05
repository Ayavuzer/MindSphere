-- Multi-tenant Migration Script
-- This migration adds tenant support to the existing MindSphere database

BEGIN;

-- 1. Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255) UNIQUE,
  settings JSONB DEFAULT '{}',
  plan VARCHAR(50) DEFAULT 'basic',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Create tenant_users junction table
CREATE TABLE IF NOT EXISTS tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(50) DEFAULT 'member',
  status VARCHAR(20) DEFAULT 'active',
  invited_by VARCHAR(255),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- 3. Create indexes for tenant_users
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);

-- 4. Create a default "Personal" tenant for existing users
INSERT INTO tenants (id, name, slug, plan, status) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::UUID,
  'Personal',
  'personal',
  'basic',
  'active'
) ON CONFLICT (slug) DO NOTHING;

-- 5. Add tenant_id columns to existing tables
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE health_entries 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE financial_entries 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE mood_entries 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE journal_entries 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 6. Populate tenant_id for existing data with the default "Personal" tenant
UPDATE conversations 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE messages 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE tasks 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE health_entries 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE financial_entries 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE mood_entries 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE journal_entries 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

UPDATE user_preferences 
SET tenant_id = '00000000-0000-0000-0000-000000000001'::UUID 
WHERE tenant_id IS NULL;

-- 7. Add existing users to the default "Personal" tenant as owners
INSERT INTO tenant_users (tenant_id, user_id, role, status)
SELECT 
  '00000000-0000-0000-0000-000000000001'::UUID,
  id,
  'owner',
  'active'
FROM users
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 8. Make tenant_id NOT NULL after populating data
ALTER TABLE conversations 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE messages 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE tasks 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE health_entries 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE financial_entries 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE mood_entries 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE journal_entries 
ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE user_preferences 
ALTER COLUMN tenant_id SET NOT NULL;

-- 9. Create indexes for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_health_entries_tenant ON health_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_health_entries_user ON health_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_financial_entries_tenant ON financial_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_entries_user ON financial_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_mood_entries_tenant ON mood_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_user ON mood_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_user ON journal_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_user_preferences_tenant ON user_preferences(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- 10. Create compound indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON conversations(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_health_entries_tenant_date ON health_entries(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_tenant_date ON mood_entries(tenant_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_date ON journal_entries(tenant_id, date DESC);

-- 11. Enable Row Level Security (RLS) for multi-tenant isolation
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for tenant isolation
-- Note: These policies will be activated when the application sets the tenant context

-- Tenants: Users can only see tenants they belong to
CREATE POLICY tenant_access ON tenants
  FOR ALL
  USING (
    id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = current_setting('app.current_user_id', true)
      AND status = 'active'
    )
  );

-- Tenant Users: Users can see their own memberships and others in same tenant (with admin+ role)
CREATE POLICY tenant_users_access ON tenant_users
  FOR ALL
  USING (
    user_id = current_setting('app.current_user_id', true)
    OR 
    (
      tenant_id = current_setting('app.current_tenant_id', true)::UUID
      AND EXISTS (
        SELECT 1 FROM tenant_users tu 
        WHERE tu.tenant_id = current_setting('app.current_tenant_id', true)::UUID
        AND tu.user_id = current_setting('app.current_user_id', true)
        AND tu.role IN ('owner', 'admin')
        AND tu.status = 'active'
      )
    )
  );

-- Data tables: All scoped to current tenant
CREATE POLICY conversations_tenant_access ON conversations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY messages_tenant_access ON messages
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY tasks_tenant_access ON tasks
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY health_entries_tenant_access ON health_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY financial_entries_tenant_access ON financial_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY mood_entries_tenant_access ON mood_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY journal_entries_tenant_access ON journal_entries
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY user_preferences_tenant_access ON user_preferences
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

COMMIT;

-- Migration complete!
-- Next steps:
-- 1. Update application code to set tenant context
-- 2. Test data isolation between tenants
-- 3. Verify all queries work with tenant scoping