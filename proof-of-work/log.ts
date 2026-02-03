#!/usr/bin/env bun
/**
 * Log a new activity to the proof-of-work system.
 * 
 * Usage:
 *   bun log.ts <type> <description> [--meta key=value ...]
 * 
 * Example:
 *   bun log.ts build "Created signing system" --meta cycle=2
 *   bun log.ts commit "feat: add on-chain proofs" --meta hash=abc123
 *   bun log.ts trade "Swapped 1 SOL for USDC" --meta amount=1 --meta pair=SOL/USDC
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ACTIVITY_FILE = join(import.meta.dir, 'activity.json');

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

function loadActivities(): Activity[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
}

function saveActivities(activities: Activity[]): void {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
}

// Parse args
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: bun log.ts <type> <description> [--meta key=value ...]');
  console.log('');
  console.log('Types: build, commit, trade, decision, message, research, deploy');
  console.log('');
  console.log('Examples:');
  console.log('  bun log.ts build "Created signing system" --meta cycle=2');
  console.log('  bun log.ts commit "feat: add proofs" --meta hash=abc123');
  process.exit(1);
}

const type = args[0];
const description = args[1];
const metadata: Record<string, any> = {};

// Parse --meta flags
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--meta' && args[i + 1]) {
    const [key, ...valueParts] = args[i + 1].split('=');
    const value = valueParts.join('=');
    // Try to parse as number or boolean
    if (value === 'true') metadata[key] = true;
    else if (value === 'false') metadata[key] = false;
    else if (!isNaN(Number(value))) metadata[key] = Number(value);
    else metadata[key] = value;
    i++;
  }
}

// Create activity
const activity: Activity = {
  timestamp: new Date().toISOString(),
  type,
  description,
};

if (Object.keys(metadata).length > 0) {
  activity.metadata = metadata;
}

// Add to log
const activities = loadActivities();
activities.push(activity);
saveActivities(activities);

console.log(`✅ Logged: [${type}] ${description}`);
if (Object.keys(metadata).length > 0) {
  console.log(`   Metadata: ${JSON.stringify(metadata)}`);
}
console.log(`   Total activities: ${activities.length}`);
