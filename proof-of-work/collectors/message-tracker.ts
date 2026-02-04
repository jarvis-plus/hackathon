#!/usr/bin/env bun
/**
 * Message Tracker - Logs important messages sent by the agent
 * 
 * This is a helper script called when the agent sends significant messages.
 * Unlike automatic collectors, this is manually invoked for noteworthy communications.
 * 
 * Usage:
 *   bun run collectors/message-tracker.ts --channel telegram --target "Souren" --summary "Responded to question about hackathon progress"
 *   bun run collectors/message-tracker.ts --channel discord --target "#general" --summary "Shared build update"
 * 
 * Or call from code:
 *   import { logMessage } from './collectors/message-tracker.ts'
 *   await logMessage({ channel: 'telegram', target: 'Souren', summary: '...' })
 */

import { join } from 'path';
import {
  type Activity,
  type MessageState,
  type MessageMetadata,
  loadActivities,
  saveActivities,
  loadState as loadGenericState,
  saveState as saveGenericState,
} from './types.js';

const STATE_FILE = join(import.meta.dir, 'message-state.json');

const DEFAULT_STATE: MessageState = {
  totalMessages: 0,
  byChannel: {},
  lastMessage: null,
};

/**
 * Options for logging a message activity
 */
interface MessageLogOptions {
  channel: string;       // telegram, discord, email, etc.
  target: string;        // recipient/channel name
  summary: string;       // brief description of the message
  messageId?: string;    // optional: message ID for reference
  replyTo?: string;      // optional: if it's a reply
  hasMedia?: boolean;    // optional: if message includes media
}

function loadState(): MessageState {
  return loadGenericState(STATE_FILE, DEFAULT_STATE);
}

function saveState(state: MessageState): void {
  saveGenericState(STATE_FILE, state);
}

export async function logMessage(opts: MessageLogOptions): Promise<void> {
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  // Check for recent duplicate (within 1 minute, same channel+target+summary)
  const recentDupe = activities.find(a => {
    if (a.type !== 'message') return false;
    const timeDiff = now.getTime() - new Date(a.timestamp).getTime();
    if (timeDiff > 60000) return false; // More than 1 minute ago
    return a.metadata?.channel === opts.channel && 
           a.metadata?.target === opts.target &&
           a.description.includes(opts.summary);
  });
  
  if (recentDupe) {
    console.log('⏭️ Skipping duplicate message log');
    return;
  }
  
  // Build description
  const channelEmoji: Record<string, string> = {
    telegram: '📱',
    discord: '💬',
    email: '📧',
    twitter: '🐦',
    slack: '🔔',
  };
  const emoji = channelEmoji[opts.channel.toLowerCase()] || '💌';
  
  const description = `${emoji} Sent message via ${opts.channel} to ${opts.target}: ${opts.summary}`;
  
  const activity: Activity = {
    timestamp: now.toISOString(),
    type: 'message',
    description,
    metadata: {
      channel: opts.channel,
      target: opts.target,
      summary: opts.summary,
      ...(opts.messageId && { messageId: opts.messageId }),
      ...(opts.replyTo && { replyTo: opts.replyTo }),
      ...(opts.hasMedia && { hasMedia: opts.hasMedia }),
    }
  };
  
  activities.push(activity);
  saveActivities(activities);
  
  // Update state
  state.totalMessages++;
  state.byChannel[opts.channel] = (state.byChannel[opts.channel] || 0) + 1;
  state.lastMessage = now.toISOString();
  saveState(state);
  
  console.log(`✅ Logged message: ${description}`);
  console.log(`   Total messages logged: ${state.totalMessages}`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
📨 Message Tracker - Log important messages sent by the agent

Usage:
  bun run collectors/message-tracker.ts --channel <channel> --target <recipient> --summary <description>

Options:
  --channel    Platform (telegram, discord, email, twitter, slack)
  --target     Recipient or channel name
  --summary    Brief description of the message content
  --message-id (optional) Message ID for reference
  --reply-to   (optional) If replying to a message
  --has-media  (optional) Flag if message includes media

Examples:
  bun run collectors/message-tracker.ts --channel telegram --target "Souren" --summary "Shared hackathon progress update"
  bun run collectors/message-tracker.ts --channel discord --target "#builds" --summary "Posted cycle 9 completion"
`);
    return;
  }
  
  // Parse args
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };
  
  const channel = getArg('channel');
  const target = getArg('target');
  const summary = getArg('summary');
  const messageId = getArg('message-id');
  const replyTo = getArg('reply-to');
  const hasMedia = args.includes('--has-media');
  
  if (!channel || !target || !summary) {
    console.error('❌ Missing required args: --channel, --target, --summary');
    process.exit(1);
  }
  
  await logMessage({
    channel,
    target,
    summary,
    messageId,
    replyTo,
    hasMedia,
  });
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
