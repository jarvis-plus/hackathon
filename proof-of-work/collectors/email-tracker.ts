#!/usr/bin/env bun
/**
 * Email Tracker - Logs emails sent by the agent via Gmail
 * 
 * Automatically polls Gmail's sent folder for new emails and logs them
 * as activities. Uses the gog CLI to access Gmail with file-based keyring.
 * 
 * Usage:
 *   bun run collectors/email-tracker.ts          # Check for new sent emails
 *   bun run collectors/email-tracker.ts --force  # Re-check all emails
 * 
 * Environment:
 *   GOG_KEYRING_BACKEND=file
 *   GOG_KEYRING_PASSWORD=<from pass gog/keyring-password>
 * 
 * Called by cron-runner.sh every 30 minutes.
 */

import { join } from 'path';
import { execSync } from 'child_process';
import {
  type Activity,
  type EmailState,
  type EmailMetadata,
  loadActivities,
  saveActivities,
  loadState as loadGenericState,
  saveState as saveGenericState,
  truncate,
} from './types.js';

const STATE_FILE = join(import.meta.dir, 'email-state.json');
const ACCOUNT = 'jarvis@avo.so';

const DEFAULT_STATE: EmailState = {
  lastCheck: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Start from 7 days ago
  knownThreadIds: [],
  totalEmails: 0,
};

interface GmailThread {
  id: string;
  date: string;
  from: string;
  subject: string;
  labels: string[];
  messageCount: number;
}

interface GmailSearchResult {
  nextPageToken: string;
  threads: GmailThread[];
}

interface GmailMessage {
  id: string;
  thread_id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
}

function loadState(): EmailState {
  return loadGenericState(STATE_FILE, DEFAULT_STATE);
}

function saveState(state: EmailState): void {
  saveGenericState(STATE_FILE, state);
}

/**
 * Get the keyring password from pass
 */
function getKeyringPassword(): string {
  try {
    return execSync('pass gog/keyring-password', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.error('❌ Failed to get keyring password from pass');
    throw err;
  }
}

/**
 * Execute gog gmail command with proper environment
 */
function gogGmail(args: string): string {
  const password = getKeyringPassword();
  const cmd = `GOG_KEYRING_BACKEND=file GOG_KEYRING_PASSWORD="${password}" gog gmail ${args} --account ${ACCOUNT}`;
  
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  } catch (err: unknown) {
    const error = err as { stderr?: string };
    console.error('❌ gog gmail command failed:', error.stderr || err);
    throw err;
  }
}

/**
 * Search for sent emails since a given date
 */
function searchSentEmails(afterDate: string): GmailThread[] {
  // Format date as YYYY/MM/DD for Gmail search
  const dateObj = new Date(afterDate);
  const dateStr = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
  
  try {
    const output = gogGmail(`search "in:sent after:${dateStr}" --max 20 --json`);
    const result: GmailSearchResult = JSON.parse(output);
    return result.threads || [];
  } catch (err) {
    console.error('❌ Failed to search sent emails');
    return [];
  }
}

/**
 * Get details of a specific email thread
 */
function getEmailDetails(threadId: string): GmailMessage | null {
  try {
    const output = gogGmail(`get ${threadId}`);
    
    // Parse the tab-separated output
    const lines = output.split('\n');
    const message: Record<string, string> = {};
    
    for (const line of lines) {
      const [key, ...valueParts] = line.split('\t');
      if (key && valueParts.length > 0) {
        message[key] = valueParts.join('\t');
      }
    }
    
    return {
      id: message.id || threadId,
      thread_id: message.thread_id || threadId,
      from: message.from || ACCOUNT,
      to: message.to || '',
      subject: message.subject || '(No subject)',
      date: message.date || new Date().toISOString(),
    };
  } catch (err) {
    console.error(`❌ Failed to get email details for ${threadId}`);
    return null;
  }
}

/**
 * Main tracking function - check for new sent emails
 */
export async function trackEmails(force = false): Promise<void> {
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  console.log('📧 Email Tracker starting...');
  console.log(`   Last check: ${state.lastCheck}`);
  console.log(`   Known threads: ${state.knownThreadIds.length}`);
  
  // Search for sent emails since last check
  const checkDate = force ? DEFAULT_STATE.lastCheck : state.lastCheck;
  const threads = searchSentEmails(checkDate);
  
  console.log(`   Found ${threads.length} sent threads since ${checkDate}`);
  
  let newCount = 0;
  
  for (const thread of threads) {
    // Skip if already known
    if (state.knownThreadIds.includes(thread.id)) {
      continue;
    }
    
    // Get full email details
    const details = getEmailDetails(thread.id);
    if (!details) continue;
    
    // Create activity
    const recipientDisplay = truncate(details.to, 40);
    const subjectDisplay = truncate(details.subject, 60);
    
    const activity: Activity = {
      timestamp: new Date(thread.date).toISOString(),
      type: 'email',
      description: `📧 Sent email to ${recipientDisplay}: "${subjectDisplay}"`,
      metadata: {
        to: details.to,
        subject: details.subject,
        from: details.from,
        threadId: thread.id,
        messageCount: thread.messageCount,
        account: ACCOUNT,
      } as EmailMetadata,
    };
    
    activities.push(activity);
    state.knownThreadIds.push(thread.id);
    state.totalEmails++;
    newCount++;
    
    console.log(`   ✅ Logged: ${subjectDisplay}`);
  }
  
  // Update state
  state.lastCheck = now.toISOString();
  
  // Keep only last 100 known thread IDs to prevent state bloat
  if (state.knownThreadIds.length > 100) {
    state.knownThreadIds = state.knownThreadIds.slice(-100);
  }
  
  saveState(state);
  
  if (newCount > 0) {
    saveActivities(activities);
    console.log(`\n📧 Email tracking complete: ${newCount} new emails logged`);
    console.log(`   Total emails tracked: ${state.totalEmails}`);
  } else {
    console.log('\n📧 Email tracking complete: No new emails');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📧 Email Tracker - Log emails sent by the agent

Usage:
  bun run collectors/email-tracker.ts          # Check for new sent emails
  bun run collectors/email-tracker.ts --force  # Re-check all emails (last 7 days)

Tracks:
  - Emails sent via ${ACCOUNT}
  - Logs recipient, subject, and thread info
  - Deduplicates based on thread ID

State file: ${STATE_FILE}
`);
    return;
  }
  
  const force = args.includes('--force');
  await trackEmails(force);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
