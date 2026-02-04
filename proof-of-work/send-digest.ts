#!/usr/bin/env bun
/**
 * Email Digest Sender
 * 
 * This script sends email digests to all active subscribers based on their
 * frequency preference (daily, weekly, monthly).
 * 
 * Usage:
 *   bun run send-digest.ts [--dry-run] [--frequency daily|weekly|monthly]
 * 
 * Options:
 *   --dry-run     Show what would be sent without actually sending
 *   --frequency   Only process subscriptions with this frequency
 *   --force       Send even if already sent today
 * 
 * Cron examples:
 *   Daily at 8am:   0 8 * * * cd /path/to && bun run send-digest.ts --frequency daily
 *   Weekly on Mon:  0 9 * * 1 cd /path/to && bun run send-digest.ts --frequency weekly
 *   Monthly on 1st: 0 10 1 * * cd /path/to && bun run send-digest.ts --frequency monthly
 * 
 * @requires GOG_KEYRING_BACKEND=file GOG_KEYRING_PASSWORD environment vars for gog
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Configuration
const BASE_DIR = import.meta.dir;
const DIGEST_FILE = join(BASE_DIR, 'data', 'digest-subscriptions.json');
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const frequencyArg = args.find(a => a.startsWith('--frequency='))?.split('=')[1] 
  || (args.includes('--frequency') ? args[args.indexOf('--frequency') + 1] : null);

interface DigestSubscription {
  id: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  lastSent?: string;
  active: boolean;
  timezone?: string;
}

interface Activity {
  type: string;
  description: string;
  timestamp: string;
  signature?: string;
  proof?: { txSignature?: string };
  pinned?: boolean;
}

/**
 * Load digest subscriptions from file.
 */
function getSubscriptions(): DigestSubscription[] {
  if (!existsSync(DIGEST_FILE)) return [];
  try {
    return JSON.parse(readFileSync(DIGEST_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to load subscriptions:', e);
    return [];
  }
}

/**
 * Save subscriptions back to file.
 */
function saveSubscriptions(subs: DigestSubscription[]): void {
  writeFileSync(DIGEST_FILE, JSON.stringify(subs, null, 2));
}

/**
 * Load activities from file.
 */
function getActivities(): Activity[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  try {
    return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  } catch (e) {
    console.error('Failed to load activities:', e);
    return [];
  }
}

/**
 * Check if a subscription is due for sending.
 */
function isDueForSending(sub: DigestSubscription): boolean {
  if (!sub.active) return false;
  if (force) return true;
  if (!sub.lastSent) return true; // Never sent before
  
  const lastSent = new Date(sub.lastSent);
  const now = new Date();
  const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
  
  switch (sub.frequency) {
    case 'daily':
      return hoursSinceLast >= 23; // Allow 1 hour tolerance
    case 'weekly':
      return hoursSinceLast >= 167; // 7 days - 1 hour
    case 'monthly':
      return hoursSinceLast >= 719; // 30 days - 1 hour
    default:
      return false;
  }
}

/**
 * Get digest period dates based on frequency.
 */
function getDigestPeriod(frequency: string): { start: Date; end: Date; label: string } {
  const end = new Date();
  const start = new Date();
  
  switch (frequency) {
    case 'weekly':
      start.setDate(start.getDate() - 7);
      return { start, end, label: 'Weekly' };
    case 'monthly':
      start.setMonth(start.getMonth() - 1);
      return { start, end, label: 'Monthly' };
    case 'daily':
    default:
      start.setDate(start.getDate() - 1);
      return { start, end, label: 'Daily' };
  }
}

/**
 * Generate HTML digest email content.
 */
function generateDigestHtml(
  activities: Activity[], 
  period: { start: Date; end: Date; label: string },
  unsubscribeId: string
): string {
  // Filter activities in period
  const periodActivities = activities.filter(a => {
    const date = new Date(a.timestamp);
    return date >= period.start && date <= period.end;
  });
  
  // Calculate stats
  const onchainCount = periodActivities.filter(a => 
    a.signature || a.proof?.txSignature
  ).length;
  
  const typeCounts: Record<string, number> = {};
  periodActivities.forEach(a => {
    typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
  });
  
  const topTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  const uniqueDays = new Set(periodActivities.map(a => 
    new Date(a.timestamp).toISOString().split('T')[0]
  )).size;
  
  const highlights = periodActivities
    .filter(a => a.pinned || a.type === 'build' || a.type === 'decision')
    .slice(-10)
    .reverse();
  
  const verificationRate = periodActivities.length > 0 
    ? Math.round((onchainCount / periodActivities.length) * 100)
    : 0;
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jarvis Proof of Work - ${period.label} Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f5f5;">
  <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0ea5e9;">
      <h1 style="color: #0ea5e9; margin: 0 0 8px 0; font-size: 24px;">🤖 Jarvis Proof of Work</h1>
      <div style="color: #666; font-size: 14px;">${period.label} Digest: ${period.start.toLocaleDateString()} - ${period.end.toLocaleDateString()}</div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px;">
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #0ea5e9;">${periodActivities.length}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Activities</div>
      </div>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #0ea5e9;">${verificationRate}%</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">On-Chain</div>
      </div>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #0ea5e9;">${uniqueDays}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">Active Days</div>
      </div>
      <div style="background: #f8fafc; padding: 15px; border-radius: 8px; text-align: center;">
        <div style="font-size: 28px; font-weight: bold; color: #0ea5e9;">${topTypes[0]?.[1] || 0}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px;">${topTypes[0]?.[0] || 'N/A'}</div>
      </div>
    </div>
    
    <div style="margin-bottom: 25px;">
      <h2 style="font-size: 16px; color: #333; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">📊 Activity Breakdown</h2>
      ${topTypes.map(([type, count]) => `
        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="font-weight: 500;">${type}</span>
          <span style="color: #0ea5e9; font-weight: bold;">${count}</span>
        </div>
      `).join('')}
    </div>
    
    <div style="margin-bottom: 25px;">
      <h2 style="font-size: 16px; color: #333; margin: 0 0 15px 0; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb;">⭐ Highlights</h2>
      ${highlights.length > 0 
        ? highlights.map(h => `
          <div style="padding: 12px; margin-bottom: 10px; background: ${h.pinned ? '#fffbeb' : '#f8fafc'}; border-radius: 6px; border-left: 3px solid ${h.pinned ? '#f59e0b' : '#0ea5e9'};">
            <span style="display: inline-block; font-size: 10px; padding: 2px 6px; background: ${h.pinned ? '#f59e0b' : '#0ea5e9'}; color: white; border-radius: 4px; text-transform: uppercase; margin-bottom: 5px;">${h.pinned ? '📌 ' : ''}${h.type}</span>
            <div style="font-size: 14px; color: #333;">${h.description.slice(0, 150)}${h.description.length > 150 ? '...' : ''}</div>
          </div>
        `).join('')
        : '<p style="color: #666; font-style: italic;">No highlights for this period.</p>'
      }
    </div>
    
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="https://jarvis.tail6a9bde.ts.net/pow/" style="display: inline-block; background: linear-gradient(135deg, #0ea5e9, #06b6d4); color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Full Dashboard →</a>
    </div>
    
    <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #999;">
      <p>Jarvis AI Agent | <a href="https://colosseum.com/agent-hackathon" style="color: #0ea5e9; text-decoration: none;">Colosseum Agent Hackathon 2026</a></p>
      <p>
        <a href="https://jarvis.tail6a9bde.ts.net/pow/" style="color: #0ea5e9; text-decoration: none;">Dashboard</a> · 
        <a href="https://jarvis.tail6a9bde.ts.net/pow/api/activities" style="color: #0ea5e9; text-decoration: none;">API</a> · 
        <a href="https://jarvis.tail6a9bde.ts.net/pow/api/feed.rss" style="color: #0ea5e9; text-decoration: none;">RSS</a>
      </p>
      <p style="margin-top: 15px;">
        <a href="https://jarvis.tail6a9bde.ts.net/pow/api/digest/subscriptions/${unsubscribeId}" style="color: #999; text-decoration: none;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Send email using gog.
 */
function sendEmail(to: string, subject: string, htmlBody: string): boolean {
  // Create a temp file for the HTML body
  const tempFile = `/tmp/digest-${Date.now()}.html`;
  writeFileSync(tempFile, htmlBody);
  
  try {
    // Use gog to send email
    // Requires GOG_KEYRING_BACKEND=file and GOG_KEYRING_PASSWORD to be set
    const gogPrefix = 'GOG_KEYRING_BACKEND=file GOG_KEYRING_PASSWORD="$(pass gog/keyring-password)"';
    
    const cmd = `${gogPrefix} gog gmail send --account jarvis@avo.so --to "${to}" --subject "${subject}" --html-file "${tempFile}"`;
    
    if (dryRun) {
      console.log(`  [DRY RUN] Would send email to ${to}`);
      console.log(`  Command: gog gmail send --to "${to}" --subject "${subject}"`);
      return true;
    }
    
    execSync(cmd, { 
      shell: '/bin/bash',
      stdio: 'pipe',
      timeout: 30000 
    });
    
    console.log(`  ✅ Email sent to ${to}`);
    return true;
  } catch (e: any) {
    console.error(`  ❌ Failed to send to ${to}:`, e.message);
    return false;
  } finally {
    // Clean up temp file
    try {
      if (existsSync(tempFile)) {
        execSync(`rm ${tempFile}`);
      }
    } catch {}
  }
}

// Main execution
async function main() {
  console.log('📧 Jarvis Digest Sender');
  console.log('========================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (frequencyArg) console.log(`Frequency filter: ${frequencyArg}`);
  if (force) console.log('Force mode: enabled');
  console.log('');
  
  const subscriptions = getSubscriptions();
  const activities = getActivities();
  
  console.log(`Found ${subscriptions.length} total subscriptions`);
  console.log(`Found ${activities.length} total activities`);
  console.log('');
  
  // Filter subscriptions
  let toProcess = subscriptions.filter(s => {
    // Filter by frequency if specified
    if (frequencyArg && s.frequency !== frequencyArg) return false;
    // Check if due
    return isDueForSending(s);
  });
  
  console.log(`Processing ${toProcess.length} subscriptions due for sending`);
  console.log('');
  
  let sent = 0;
  let failed = 0;
  
  for (const sub of toProcess) {
    console.log(`Processing: ${sub.email} (${sub.frequency})`);
    
    const period = getDigestPeriod(sub.frequency);
    const html = generateDigestHtml(activities, period, sub.id);
    const subject = `🤖 Jarvis ${period.label} Digest - ${period.end.toLocaleDateString()}`;
    
    const success = sendEmail(sub.email, subject, html);
    
    if (success) {
      sent++;
      // Update lastSent timestamp
      if (!dryRun) {
        sub.lastSent = new Date().toISOString();
      }
    } else {
      failed++;
    }
    
    console.log('');
  }
  
  // Save updated subscriptions
  if (!dryRun && sent > 0) {
    saveSubscriptions(subscriptions);
    console.log('Updated subscription timestamps');
  }
  
  console.log('========================');
  console.log(`Summary: ${sent} sent, ${failed} failed`);
  
  if (dryRun) {
    console.log('');
    console.log('This was a dry run. No emails were actually sent.');
    console.log('Remove --dry-run to send for real.');
  }
}

main().catch(console.error);
