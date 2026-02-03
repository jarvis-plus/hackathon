#!/usr/bin/env bun
/**
 * Twitter/X Tracker - Logs tweets and posts to the activity feed
 * 
 * This tracks when Jarvis posts content to Twitter/X.
 * Can be called manually or integrated with posting workflows.
 * 
 * Usage:
 *   bun run collectors/twitter-tracker.ts --content "Just shipped cycle 10!" --url "https://x.com/..."
 *   bun run collectors/twitter-tracker.ts --content "Thread: Why proof-of-work matters" --type thread
 * 
 * Or call from code:
 *   import { logTweet } from './collectors/twitter-tracker.ts'
 *   await logTweet({ content: '...', tweetUrl: '...' })
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ACTIVITY_FILE = join(import.meta.dir, '../activity.json');
const STATE_FILE = join(import.meta.dir, 'twitter-state.json');

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

interface TwitterState {
  totalTweets: number;
  totalThreads: number;
  totalReplies: number;
  lastTweet: string | null;
  tweetIds: string[];  // Track to avoid duplicates
}

interface TweetLogOptions {
  content: string;        // Tweet text (truncated for display)
  tweetUrl?: string;      // Full URL to tweet
  tweetId?: string;       // Tweet ID
  tweetType?: 'tweet' | 'thread' | 'reply' | 'quote' | 'retweet';
  replyTo?: string;       // If reply, the original tweet
  mediaCount?: number;    // Number of images/videos
  threadPosition?: number; // Position in thread (1, 2, 3...)
}

function loadState(): TwitterState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return { 
    totalTweets: 0, 
    totalThreads: 0, 
    totalReplies: 0, 
    lastTweet: null, 
    tweetIds: [] 
  };
}

function saveState(state: TwitterState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadActivities(): Activity[] {
  if (existsSync(ACTIVITY_FILE)) {
    return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  }
  return [];
}

function saveActivities(activities: Activity[]) {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

export async function logTweet(opts: TweetLogOptions): Promise<void> {
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  // Check for duplicate by tweet ID
  if (opts.tweetId && state.tweetIds.includes(opts.tweetId)) {
    console.log('⏭️ Skipping duplicate tweet (already logged)');
    return;
  }
  
  // Check for recent duplicate by content (within 5 minutes)
  const recentDupe = activities.find(a => {
    if (a.type !== 'tweet') return false;
    const timeDiff = now.getTime() - new Date(a.timestamp).getTime();
    if (timeDiff > 300000) return false; // More than 5 minutes ago
    // Check if content matches (fuzzy - first 50 chars)
    const existingContent = a.metadata?.content?.slice(0, 50);
    const newContent = opts.content.slice(0, 50);
    return existingContent === newContent;
  });
  
  if (recentDupe) {
    console.log('⏭️ Skipping duplicate tweet log (similar recent tweet)');
    return;
  }
  
  // Build description based on type
  const typeEmoji: Record<string, string> = {
    tweet: '🐦',
    thread: '🧵',
    reply: '↩️',
    quote: '💬',
    retweet: '🔄'
  };
  
  const type = opts.tweetType || 'tweet';
  const emoji = typeEmoji[type];
  const truncatedContent = truncate(opts.content, 100);
  
  let description = `${emoji} Posted ${type}: "${truncatedContent}"`;
  
  if (type === 'thread' && opts.threadPosition) {
    description = `${emoji} Thread (${opts.threadPosition}/n): "${truncatedContent}"`;
  }
  
  if (type === 'reply' && opts.replyTo) {
    description = `${emoji} Replied to @${opts.replyTo}: "${truncatedContent}"`;
  }
  
  if (opts.mediaCount && opts.mediaCount > 0) {
    description += ` [${opts.mediaCount} media]`;
  }
  
  const activity: Activity = {
    timestamp: now.toISOString(),
    type: 'tweet',
    description,
    metadata: {
      content: opts.content,
      tweetType: type,
      ...(opts.tweetUrl && { url: opts.tweetUrl }),
      ...(opts.tweetId && { tweetId: opts.tweetId }),
      ...(opts.replyTo && { replyTo: opts.replyTo }),
      ...(opts.mediaCount && { mediaCount: opts.mediaCount }),
      ...(opts.threadPosition && { threadPosition: opts.threadPosition }),
    }
  };
  
  activities.push(activity);
  saveActivities(activities);
  
  // Update state
  state.totalTweets++;
  if (type === 'thread') state.totalThreads++;
  if (type === 'reply') state.totalReplies++;
  state.lastTweet = now.toISOString();
  if (opts.tweetId) state.tweetIds.push(opts.tweetId);
  saveState(state);
  
  console.log(`✅ Logged tweet: ${description}`);
  console.log(`   Total tweets logged: ${state.totalTweets}`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
🐦 Twitter/X Tracker - Log tweets and posts by the agent

Usage:
  bun run collectors/twitter-tracker.ts --content <text> [options]

Required:
  --content    Tweet text content

Options:
  --url        URL to the tweet
  --id         Tweet ID
  --type       Type: tweet, thread, reply, quote, retweet (default: tweet)
  --reply-to   If reply, the username being replied to
  --media      Number of media attachments
  --thread-pos Position in thread (1, 2, 3...)

Examples:
  bun run collectors/twitter-tracker.ts --content "Just shipped cycle 10! 🚀" --url "https://x.com/jarvis/status/123"
  bun run collectors/twitter-tracker.ts --content "Here's my hackathon journey..." --type thread --thread-pos 1
  bun run collectors/twitter-tracker.ts --content "Great point!" --type reply --reply-to "elonmusk"
`);
    return;
  }
  
  // Parse args
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  
  const content = getArg('content');
  const tweetUrl = getArg('url');
  const tweetId = getArg('id');
  const tweetType = getArg('type') as TweetLogOptions['tweetType'];
  const replyTo = getArg('reply-to');
  const mediaCount = getArg('media') ? parseInt(getArg('media')!) : undefined;
  const threadPosition = getArg('thread-pos') ? parseInt(getArg('thread-pos')!) : undefined;
  
  if (!content) {
    console.error('❌ Missing required arg: --content');
    process.exit(1);
  }
  
  await logTweet({
    content,
    tweetUrl,
    tweetId,
    tweetType,
    replyTo,
    mediaCount,
    threadPosition,
  });
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
