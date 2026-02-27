// Database seed script — creates initial data for a fresh Mission Control instance

import { v4 as uuidv4 } from 'uuid';
import { getDb, closeDb } from './index';

async function seed() {
  console.log('🌱 Seeding database...');

  const db = getDb();
  const now = new Date().toISOString();

  // Create default workspace
  db.prepare(
    `INSERT OR IGNORE INTO workspaces (id, name, slug, description, icon)
     VALUES (?, ?, ?, ?, ?)`
  ).run('default', 'Default', 'default', 'Default workspace', '🏠');

  // Create a placeholder orchestrator agent (will be replaced by gateway import)
  const orchestratorId = uuidv4();
  db.prepare(
    `INSERT INTO agents (id, name, role, description, avatar_emoji, status, is_master, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    orchestratorId,
    'Orchestrator',
    'Team Lead',
    'Primary agent — import real agents from gateway via Discover',
    '⚡',
    'standby',
    1,
    now,
    now
  );

  // Create initial system event
  db.prepare(
    `INSERT INTO events (id, type, message, created_at)
     VALUES (?, ?, ?, ?)`
  ).run(uuidv4(), 'system', 'Mission Control is online', now);

  console.log('✅ Database seeded successfully!');
  console.log(`   - Created default workspace`);
  console.log(`   - Created placeholder orchestrator: ${orchestratorId}`);
  console.log(`   - Import real agents via the Discover button`);

  closeDb();
}

seed().catch(console.error);
