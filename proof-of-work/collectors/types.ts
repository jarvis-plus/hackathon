/**
 * Shared TypeScript types for Proof-of-Work collectors
 * 
 * All collectors import Activity and utility functions from here
 * to ensure consistent typing across the codebase.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

/**
 * Supported activity types logged by the system
 */
export type ActivityType =
  | 'browser'     // Web research (searches, fetches)
  | 'build'       // Development/build cycle work
  | 'calendar'    // Calendar events
  | 'commit'      // Git commits
  | 'decision'    // Agent decisions
  | 'deploy'      // Deployments
  | 'email'       // Emails sent
  | 'heartbeat'   // Periodic health checks
  | 'message'     // Messages sent via channels
  | 'session'     // Agent interaction sessions
  | 'trade'       // Token swaps
  | 'transfer'    // Token/SOL transfers
  | 'tweet'       // Twitter/X posts
  | 'error'       // Error events
  | string;       // Allow extension

/**
 * Metadata for trade/transfer activities
 */
export interface TradeMetadata {
  from: { token: string; amount: number };
  to: { token: string; amount?: number };
  txSignature?: string;
  source?: string;
  cycle?: string;
}

/**
 * Metadata for message activities
 */
export interface MessageMetadata {
  channel: string;
  target: string;
  summary: string;
  messageId?: string;
  replyTo?: string;
  hasMedia?: boolean;
}

/**
 * Metadata for tweet activities
 */
export interface TweetMetadata {
  content: string;
  tweetType: 'tweet' | 'thread' | 'reply' | 'quote' | 'retweet';
  url?: string;
  tweetId?: string;
  replyTo?: string;
  mediaCount?: number;
  threadPosition?: number;
}

/**
 * Metadata for email activities
 */
export interface EmailMetadata {
  to: string;
  subject: string;
  from: string;
  threadId: string;
  messageCount?: number;
  account?: string;
}

/**
 * Metadata for calendar activities
 */
export interface CalendarMetadata {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  organizer?: string;
  attendeeCount?: number;
  location?: string;
  meetingLink?: string;
  calendarLink?: string;
}

/**
 * Metadata for heartbeat activities
 */
export interface HeartbeatMetadata {
  status: 'active' | 'idle' | 'degraded';
  health: {
    gateway: boolean;
    dashboard: boolean;
    memory: string;
  };
  lastActivityMinutesAgo: number;
  lastActivityType?: string;
  consecutiveBeats: number;
  totalBeats: number;
  uptimeHours: number;
}

/**
 * Metadata for session activities
 */
export interface SessionMetadata {
  sources: string[];
  interactionCount: number;
  uniqueSessions: number;
  presenceCount: number;
  cronJobsActive: number;
  periodMinutes: number;
}

/**
 * Metadata for commit activities
 */
export interface CommitMetadata {
  sha: string;
  shortSha: string;
  author: string;
  files: number;
  insertions: number;
  deletions: number;
  repo?: string;
}

/**
 * Metadata for build activities
 */
export interface BuildMetadata {
  cycle?: number;
  filesChanged?: number;
  linesAdded?: number;
  linesRemoved?: number;
  testsPassed?: boolean;
  duration?: number;
}

/**
 * Union of all possible metadata types
 */
export type ActivityMetadata =
  | TradeMetadata
  | MessageMetadata
  | TweetMetadata
  | EmailMetadata
  | CalendarMetadata
  | HeartbeatMetadata
  | SessionMetadata
  | CommitMetadata
  | BuildMetadata
  | BrowserMetadata
  | Record<string, unknown>;

/**
 * Core Activity interface used throughout the system
 */
export interface Activity {
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Activity type categorization */
  type: ActivityType;
  
  /** Human-readable description */
  description: string;
  
  /** Type-specific metadata */
  metadata?: ActivityMetadata;
  
  /** Optional tags for categorization (e.g., 'hackathon', 'trading', 'infra') */
  tags?: string[];
  
  /** Wallet address that signed this activity */
  wallet?: string;
  
  /** On-chain signature (added by sign-activity.ts) */
  signature?: string;
  
  /** Content hash for verification */
  hash?: string;
}

// ============================================================================
// WALLET CONFIGURATION
// ============================================================================

/**
 * Known wallet addresses for multi-wallet support
 * Maps wallet address to a human-readable name
 */
export const KNOWN_WALLETS: Record<string, string> = {
  'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX': 'Jarvis',
  // Add additional wallets here as needed
};

/**
 * Default wallet address (Jarvis main wallet)
 */
export const DEFAULT_WALLET = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';

/**
 * Get display name for a wallet address
 */
export function getWalletName(address: string): string {
  return KNOWN_WALLETS[address] || address.slice(0, 8) + '...';
}

/**
 * Get short wallet address (first 4 + last 4 chars)
 */
export function shortWallet(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// ============================================================================
// STATE TYPES
// ============================================================================

/**
 * Base state interface - all collector states should extend this
 */
export interface BaseState {
  lastCheck?: string;
}

/**
 * Heartbeat tracker state
 */
export interface HeartbeatState extends BaseState {
  lastHeartbeat: string | null;
  consecutiveBeats: number;
  totalBeats: number;
}

/**
 * Session tracker state
 */
export interface SessionState extends BaseState {
  lastCheck: string;
  sessionsLogged: string[];
  totalSessions: number;
}

/**
 * Message tracker state
 */
export interface MessageState extends BaseState {
  totalMessages: number;
  byChannel: Record<string, number>;
  lastMessage: string | null;
}

/**
 * Twitter tracker state
 */
export interface TwitterState extends BaseState {
  totalTweets: number;
  totalThreads: number;
  totalReplies: number;
  lastTweet: string | null;
  tweetIds: string[];
}

/**
 * Wallet tracker state
 */
export interface WalletState extends BaseState {
  lastSignature: string | null;
  lastCheck: string;
}

/**
 * Recurring trade state
 */
export interface TradeState extends BaseState {
  lastTradeTimestamp: string | null;
  totalTrades: number;
  totalVolumeSOL: number;
  totalVolumeUSDC: number;
  history: Array<{
    timestamp: string;
    from: string;
    to: string;
    amount: number;
    txSignature?: string;
  }>;
}

/**
 * Email tracker state
 */
export interface EmailState extends BaseState {
  lastCheck: string;
  knownThreadIds: string[];
  totalEmails: number;
}

/**
 * Calendar tracker state
 */
export interface CalendarState extends BaseState {
  lastCheck: string;
  knownEventIds: string[];
  totalEvents: number;
}

/**
 * Metadata for browser/research activities
 */
export interface BrowserMetadata {
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
 * Browser tracker state
 */
export interface BrowserState extends BaseState {
  lastCheck: string;
  processedIds: string[];
  totalSearches: number;
  totalFetches: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Path to the main activity file */
const ACTIVITY_FILE = join(dirname(import.meta.dir), 'activity.json');

/**
 * Load all activities from the activity file
 */
export function loadActivities(): Activity[] {
  if (existsSync(ACTIVITY_FILE)) {
    return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  }
  return [];
}

/**
 * Save activities to the activity file
 */
export function saveActivities(activities: Activity[]): void {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
}

/**
 * Add a single activity to the log
 */
export function addActivity(activity: Activity): void {
  const activities = loadActivities();
  activities.push(activity);
  saveActivities(activities);
}

/**
 * Load collector state from a JSON file
 */
export function loadState<T extends BaseState>(stateFile: string, defaults: T): T {
  if (existsSync(stateFile)) {
    return JSON.parse(readFileSync(stateFile, 'utf-8'));
  }
  return defaults;
}

/**
 * Save collector state to a JSON file
 */
export function saveState<T extends BaseState>(stateFile: string, state: T): void {
  writeFileSync(stateFile, JSON.stringify(state, null, 2));
}

/**
 * Get the activity file path (for collectors that need it)
 */
export function getActivityFilePath(): string {
  return ACTIVITY_FILE;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + '...';
}

/**
 * Check if two timestamps are within a given duration (milliseconds)
 */
export function isWithinDuration(ts1: string | Date, ts2: string | Date, durationMs: number): boolean {
  const t1 = new Date(ts1).getTime();
  const t2 = new Date(ts2).getTime();
  return Math.abs(t1 - t2) < durationMs;
}

/**
 * Create a new activity with current timestamp
 */
export function createActivity(
  type: ActivityType,
  description: string,
  metadata?: ActivityMetadata,
  tags?: string[]
): Activity {
  return {
    timestamp: new Date().toISOString(),
    type,
    description,
    ...(metadata && { metadata }),
    ...(tags && tags.length > 0 && { tags }),
  };
}

/**
 * Pre-defined tag categories for consistency
 */
export const TAG_PRESETS = {
  // Project context
  hackathon: 'hackathon',
  infrastructure: 'infra',
  trading: 'trading',
  social: 'social',
  research: 'research',
  
  // Priority/importance
  milestone: 'milestone',
  critical: 'critical',
  routine: 'routine',
  
  // Source
  automated: 'auto',
  manual: 'manual',
  scheduled: 'scheduled',
} as const;

export type TagPreset = typeof TAG_PRESETS[keyof typeof TAG_PRESETS];
