#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { config } from 'dotenv';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🚀 Starting multi-tenant migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, '../migrations/001_add_multi_tenant_support.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    console.log('📊 Executing migration...');
    await pool.query(migrationSQL);
    
    console.log('✅ Multi-tenant migration completed successfully!');
    console.log('');
    console.log('Migration Summary:');
    console.log('- Created tenants and tenant_users tables');
    console.log('- Added tenant_id to all data tables');
    console.log('- Created default "Personal" tenant');
    console.log('- Migrated existing data to default tenant');
    console.log('- Added database indexes for performance');
    console.log('- Enabled Row Level Security (RLS)');
    console.log('- Created tenant isolation policies');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update application code to use tenant context');
    console.log('2. Test tenant isolation');
    console.log('3. Add tenant management UI');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

export { runMigration };