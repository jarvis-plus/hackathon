#!/usr/bin/env bun
/**
 * Log Browser Activity Helper - Add entries to the browser activity log
 * 
 * This helper makes it easy to log web research activities from anywhere.
 * The browser-tracker.ts collector will process these entries into activities.
 * 
 * Usage:
 *   bun run collectors/log-browser.ts search "query" [--results N] [--source brave]
 *   bun run collectors/log-browser.ts fetch "url" [--size N] [--topic "topic"]
 *   bun run collectors/log-browser.ts browse "topic" [--url "url"]
 *   bun run collectors/log-browser.ts screenshot "url"
 * 
 * Examples:
 *   bun run collectors/log-browser.ts search "solana rpc endpoints" --results 5
 *   bun run collectors/log-browser.ts fetch "https://docs.solana.com" --size 45000
 *   bun run collectors/log-browser.ts browse "hackathon research"
 */

import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';

const DATA_DIR = join(dirname(import.meta.dir), 'data');
const BROWSER_LOG = join(DATA_DIR, 'browser-log.json');

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

/**
 * Generate unique ID from entry content
 */
function generateId(entry: Partial<BrowserLogEntry>): string {
  const content = `${entry.timestamp}:${entry.action}:${entry.query || entry.url || entry.topic}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
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
 * Load existing browser log
 */
function loadLog(): BrowserLogEntry[] {
  if (existsSync(BROWSER_LOG)) {
    try {
      return JSON.parse(readFileSync(BROWSER_LOG, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Save browser log
 */
function saveLog(entries: BrowserLogEntry[]): void {
  // Ensure data directory exists
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BROWSER_LOG, JSON.stringify(entries, null, 2));
}

/**
 * Add a new entry to the browser log
 */
function addEntry(entry: Omit<BrowserLogEntry, 'id'>): void {
  const entries = loadLog();
  const id = generateId(entry);
  
  // Check for duplicates
  if (entries.some(e => e.id === id)) {
    console.log(`⚠️  Duplicate entry, skipping: ${id}`);
    return;
  }
  
  const fullEntry: BrowserLogEntry = { id, ...entry };
  entries.push(fullEntry);
  saveLog(entries);
  
  console.log(`✅ Logged ${entry.action}: ${entry.query || entry.url || entry.topic}`);
  console.log(`   ID: ${id}`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { action: string; value: string; options: Record<string, string | number> } {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: log-browser.ts <action> <value> [options]');
    console.log('Actions: search, fetch, browse, screenshot');
    process.exit(1);
  }
  
  const action = args[0];
  const value = args[1];
  const options: Record<string, string | number> = {};
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = args[i + 1];
      if (val && !val.startsWith('--')) {
        // Try to parse as number
        const num = parseFloat(val);
        options[key] = isNaN(num) ? val : num;
        i++;
      } else {
        options[key] = true;
      }
    }
  }
  
  return { action, value, options };
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🌐 Log Browser Activity Helper

Usage:
  bun run collectors/log-browser.ts <action> <value> [options]

Actions:
  search <query>     Log a web search
    --results N      Number of results found
    --source NAME    Search engine used (brave, google, etc.)
  
  fetch <url>        Log a URL fetch
    --size N         Content size in bytes
    --topic NAME     Research topic
  
  browse <topic>     Log a browsing session
    --url URL        Main URL visited
  
  screenshot <url>   Log a screenshot capture

Examples:
  bun run collectors/log-browser.ts search "solana docs" --results 5
  bun run collectors/log-browser.ts fetch "https://docs.solana.com/cli" --size 25000
  bun run collectors/log-browser.ts browse "hackathon research"

Log file: ${BROWSER_LOG}
`);
    return;
  }
  
  const { action, value, options } = parseArgs();
  const timestamp = new Date().toISOString();
  
  switch (action) {
    case 'search':
      addEntry({
        timestamp,
        action: 'search',
        query: value,
        resultCount: options.results as number | undefined,
        source: options.source as string | undefined,
      });
      break;
    
    case 'fetch':
      addEntry({
        timestamp,
        action: 'fetch',
        url: value,
        domain: extractDomain(value),
        contentLength: options.size as number | undefined,
        topic: options.topic as string | undefined,
      });
      break;
    
    case 'browse':
      addEntry({
        timestamp,
        action: 'browse',
        topic: value,
        url: options.url as string | undefined,
        domain: options.url ? extractDomain(options.url as string) : undefined,
      });
      break;
    
    case 'screenshot':
      addEntry({
        timestamp,
        action: 'screenshot',
        url: value,
        domain: extractDomain(value),
      });
      break;
    
    default:
      console.error(`❌ Unknown action: ${action}`);
      console.log('Valid actions: search, fetch, browse, screenshot');
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
