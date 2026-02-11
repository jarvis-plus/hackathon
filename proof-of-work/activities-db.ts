/**
 * SQLite Database Module for Activities
 * 
 * Primary data store for the Proof of Work dashboard.
 * Uses bun:sqlite for high-performance local storage.
 * 
 * Schema stores each activity as a row with indexed columns for
 * common queries, plus a JSON blob for the full activity data.
 */

import { Database } from 'bun:sqlite';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';

const BASE_DIR = import.meta.dir;
const DB_PATH = join(BASE_DIR, 'data', 'activities.db');
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');

let _db: Database | null = null;

/**
 * Get or create the database connection (singleton).
 */
export function getDb(): Database {
  if (_db) return _db;
  
  _db = new Database(DB_PATH);
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA synchronous = NORMAL');
  
  // Create table if not exists
  _db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      hash TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Indexes for common queries
  _db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC)`);
  _db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type)`);
  
  return _db;
}

/**
 * Get all activities from SQLite, ordered by timestamp DESC.
 * Returns the full activity objects (parsed from JSON).
 */
export function getAllActivities(): any[] {
  const db = getDb();
  const rows = db.query('SELECT data FROM activities ORDER BY timestamp DESC').all() as { data: string }[];
  return rows.map(r => JSON.parse(r.data));
}

/**
 * Get a single activity by hash.
 */
export function getActivityByHash(hash: string): any | null {
  const db = getDb();
  const row = db.query('SELECT data FROM activities WHERE hash = ?').get(hash) as { data: string } | null;
  return row ? JSON.parse(row.data) : null;
}

/**
 * Upsert a single activity into SQLite.
 */
export function upsertActivity(activity: any): void {
  const db = getDb();
  const hash = activity.hash || activity.proof?.hash || '';
  if (!hash) return; // skip activities without hash
  
  const stmt = db.query(`
    INSERT INTO activities (hash, timestamp, type, description, data)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(hash) DO UPDATE SET
      timestamp = excluded.timestamp,
      type = excluded.type,
      description = excluded.description,
      data = excluded.data
  `);
  
  stmt.run(hash, activity.timestamp, activity.type, activity.description, JSON.stringify(activity));
}

/**
 * Bulk upsert activities (uses transaction for performance).
 */
export function bulkUpsertActivities(activities: any[]): number {
  const db = getDb();
  const stmt = db.query(`
    INSERT INTO activities (hash, timestamp, type, description, data)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(hash) DO UPDATE SET
      timestamp = excluded.timestamp,
      type = excluded.type,
      description = excluded.description,
      data = excluded.data
  `);
  
  let count = 0;
  const transaction = db.transaction(() => {
    for (const activity of activities) {
      const hash = activity.hash || activity.proof?.hash || '';
      if (!hash) continue;
      stmt.run(hash, activity.timestamp, activity.type, activity.description, JSON.stringify(activity));
      count++;
    }
  });
  
  transaction();
  return count;
}

/**
 * Delete an activity by hash.
 */
export function deleteActivity(hash: string): boolean {
  const db = getDb();
  const result = db.query('DELETE FROM activities WHERE hash = ?').run(hash);
  return (result as any).changes > 0;
}

/**
 * Replace ALL activities (used by saveActivities replacement).
 * Clears table and bulk inserts.
 */
export function replaceAllActivities(activities: any[]): void {
  const db = getDb();
  const transaction = db.transaction(() => {
    db.exec('DELETE FROM activities');
    const stmt = db.query(`
      INSERT INTO activities (hash, timestamp, type, description, data)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const activity of activities) {
      const hash = activity.hash || activity.proof?.hash || '';
      if (!hash) continue;
      stmt.run(hash, activity.timestamp, activity.type, activity.description, JSON.stringify(activity));
    }
  });
  transaction();
}

/**
 * Get count of activities in DB.
 */
export function getActivityCount(): number {
  const db = getDb();
  const row = db.query('SELECT COUNT(*) as count FROM activities').get() as { count: number };
  return row.count;
}

/**
 * Migrate existing activity.json data into SQLite.
 * Only imports if DB is empty. Returns number of imported activities.
 */
export function migrateFromJson(): number {
  if (!existsSync(ACTIVITY_FILE)) return 0;
  
  const currentCount = getActivityCount();
  if (currentCount > 0) {
    console.log(`📦 SQLite already has ${currentCount} activities, skipping migration`);
    return 0;
  }
  
  console.log('📦 Migrating activity.json to SQLite...');
  const activities = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  const count = bulkUpsertActivities(activities);
  console.log(`✅ Migrated ${count} activities to SQLite`);
  return count;
}
