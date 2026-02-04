#!/usr/bin/env bun
/**
 * Browser Activity Tracker - Logs web research activities
 * 
 * Monitors a browser activity log file and converts entries to activities.
 * The log file can be populated by:
 *   - Manual calls via log-browser.ts helper
 *   - Integration hooks in the agent workflow
 * 
 * Usage:
 *   bun run collectors/browser-tracker.ts          # Process new browser activity
 *   bun run collectors/browser-tracker.ts --force  # Reprocess all entries
 * 
 * Browser log format (browser-log.json):
 *   [{ id, timestamp, action, query?, url?, resultCount?, ... }]
 * 
 * Called by cron-runner.sh periodically.
 */

import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  type Activity,
  type BrowserState,
  type BrowserMetadata,
  loadActivities,
  saveActivities,
  loadState as loadGenericState,
  saveState as saveGenericState,
  truncate,
} from './types.js';

const STATE_FILE = join(import.meta.dir, 'browser-state.json');
const BROWSER_LOG = join(dirname(import.meta.dir), 'data', 'browser-log.json');

const DEFAULT_STATE: BrowserState = {
  lastCheck: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Start from 24h ago
  processedIds: [],
  totalSearches: 0,
  totalFetches: 0,
};

/**
 * Entry in the browser activity log
 */
interface BrowserLogEntry {
  id: string;
  timestamp: string;
  action: 'search' | 'fetch' | 'browse' | 'screenshot';
  query?: string;
  url?: string;
  domain?: string;
  resultCount?: number;
  contentLength?: number;
  source?: string;
  topic?: string;
}

function loadState(): BrowserState {
  return loadGenericState(STATE_FILE, DEFAULT_STATE);
}

function saveState(state: BrowserState): void {
  saveGenericState(STATE_FILE, state);
}

/**
 * Load browser activity log
 */
function loadBrowserLog(): BrowserLogEntry[] {
  if (existsSync(BROWSER_LOG)) {
    try {
      return JSON.parse(readFileSync(BROWSER_LOG, 'utf-8'));
    } catch (err) {
      console.error('❌ Failed to parse browser log:', err);
      return [];
    }
  }
  return [];
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url.slice(0, 30);
  }
}

/**
 * Create activity description based on action type
 */
function createDescription(entry: BrowserLogEntry): string {
  const emoji = entry.action === 'search' ? '🔍' : 
                entry.action === 'fetch' ? '📄' : 
                entry.action === 'screenshot' ? '📸' : '🌐';
  
  switch (entry.action) {
    case 'search':
      const resultInfo = entry.resultCount ? ` (${entry.resultCount} results)` : '';
      return `${emoji} Web search: "${truncate(entry.query || '', 60)}"${resultInfo}`;
    
    case 'fetch':
      const domain = entry.domain || (entry.url ? extractDomain(entry.url) : 'unknown');
      const sizeInfo = entry.contentLength ? ` (${Math.round(entry.contentLength / 1024)}KB)` : '';
      return `${emoji} Fetched: ${domain}${sizeInfo}`;
    
    case 'screenshot':
      const screenshotDomain = entry.domain || (entry.url ? extractDomain(entry.url) : 'unknown');
      return `${emoji} Screenshot: ${screenshotDomain}`;
    
    case 'browse':
      return `${emoji} Browsed: ${entry.topic || entry.domain || 'web research'}`;
    
    default:
      return `${emoji} Web activity: ${entry.topic || entry.query || entry.url || 'unknown'}`;
  }
}

/**
 * Main tracking function - process browser activity log
 */
export async function trackBrowserActivity(force = false): Promise<void> {
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  console.log('🌐 Browser Tracker starting...');
  console.log(`   Last check: ${state.lastCheck}`);
  console.log(`   Processed entries: ${state.processedIds.length}`);
  
  // Load browser log
  const browserLog = loadBrowserLog();
  
  if (browserLog.length === 0) {
    console.log('   No browser activity log found');
    state.lastCheck = now.toISOString();
    saveState(state);
    console.log('\n🌐 Browser tracking complete: No activity to process');
    return;
  }
  
  console.log(`   Found ${browserLog.length} entries in browser log`);
  
  let newSearches = 0;
  let newFetches = 0;
  
  for (const entry of browserLog) {
    // Skip if already processed (unless forcing)
    if (!force && state.processedIds.includes(entry.id)) {
      continue;
    }
    
    // Create activity
    const activity: Activity = {
      timestamp: entry.timestamp || now.toISOString(),
      type: 'browser',
      description: createDescription(entry),
      metadata: {
        action: entry.action,
        query: entry.query,
        url: entry.url,
        domain: entry.domain || (entry.url ? extractDomain(entry.url) : undefined),
        resultCount: entry.resultCount,
        contentLength: entry.contentLength,
        source: entry.source,
        topic: entry.topic,
      } as BrowserMetadata,
    };
    
    activities.push(activity);
    state.processedIds.push(entry.id);
    
    if (entry.action === 'search') {
      newSearches++;
      state.totalSearches++;
    } else {
      newFetches++;
      state.totalFetches++;
    }
    
    console.log(`   ✅ Logged: ${truncate(activity.description, 60)}`);
  }
  
  // Update state
  state.lastCheck = now.toISOString();
  
  // Keep only last 500 processed IDs to prevent state bloat
  if (state.processedIds.length > 500) {
    state.processedIds = state.processedIds.slice(-500);
  }
  
  saveState(state);
  
  if (newSearches > 0 || newFetches > 0) {
    saveActivities(activities);
    console.log(`\n🌐 Browser tracking complete: ${newSearches} searches, ${newFetches} fetches logged`);
    console.log(`   Total: ${state.totalSearches} searches, ${state.totalFetches} fetches`);
  } else {
    console.log('\n🌐 Browser tracking complete: No new activity');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🌐 Browser Activity Tracker - Log web research activities

Usage:
  bun run collectors/browser-tracker.ts          # Process new browser activity
  bun run collectors/browser-tracker.ts --force  # Reprocess all entries

Tracks:
  - Web searches (query, result count)
  - URL fetches (domain, content size)
  - Screenshots and browsing sessions

Browser log: ${BROWSER_LOG}
State file: ${STATE_FILE}

To log browser activity, use the log-browser.ts helper:
  bun run collectors/log-browser.ts search "your query" --results 5
  bun run collectors/log-browser.ts fetch "https://example.com" --size 1024
`);
    return;
  }
  
  const force = args.includes('--force');
  await trackBrowserActivity(force);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
