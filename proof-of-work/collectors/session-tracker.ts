#!/usr/bin/env bun
/**
 * Session Tracker - Monitors agent sessions and interactions
 * Tracks when the agent is actively responding to messages
 * 
 * Uses OpenClaw's presence system to detect activity
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ACTIVITY_FILE = join(import.meta.dir, '../activity.json');
const STATE_FILE = join(import.meta.dir, 'session-state.json');

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

interface SessionState {
  lastCheck: string;
  sessionsLogged: string[];  // Track logged sessions to avoid duplicates
  totalSessions: number;
}

function loadState(): SessionState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return { lastCheck: new Date().toISOString(), sessionsLogged: [], totalSessions: 0 };
}

function saveState(state: SessionState) {
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

interface PresenceEntry {
  host: string;
  ip: string;
  version: string;
  platform: string;
  mode: string;
  reason: string;
  ts: number;
}

function getPresence(): PresenceEntry[] {
  try {
    const output = execSync('openclaw system presence 2>/dev/null', { encoding: 'utf-8' });
    return JSON.parse(output);
  } catch {
    return [];
  }
}

interface CommandLogEntry {
  timestamp: string;
  action: string;
  sessionKey: string;
  senderId: string;
  source: string;
}

function getRecentCommands(): CommandLogEntry[] {
  const logFile = '/root/.openclaw/logs/commands.log';
  if (!existsSync(logFile)) return [];
  
  try {
    const content = readFileSync(logFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean) as CommandLogEntry[];
  } catch {
    return [];
  }
}

function getCronJobInfo(): { lastRun?: string; jobs: number } {
  try {
    const output = execSync('openclaw cron list --json 2>/dev/null || echo "[]"', { encoding: 'utf-8' });
    const jobs = JSON.parse(output);
    return { jobs: jobs.length };
  } catch {
    return { jobs: 0 };
  }
}

async function main() {
  console.log('\n🔄 Session Tracker');
  
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  // Get presence info
  const presence = getPresence();
  const commands = getRecentCommands();
  const cronInfo = getCronJobInfo();
  
  // Find new sessions since last check
  const lastCheckTime = new Date(state.lastCheck).getTime();
  const newCommands = commands.filter(cmd => {
    const cmdTime = new Date(cmd.timestamp).getTime();
    return cmdTime > lastCheckTime;
  });
  
  console.log(`📊 Presence entries: ${presence.length}`);
  console.log(`📜 Total command log entries: ${commands.length}`);
  console.log(`🆕 New commands since last check: ${newCommands.length}`);
  console.log(`⏰ Cron jobs active: ${cronInfo.jobs}`);
  
  // Group new commands by session for logging
  const sessionGroups = new Map<string, CommandLogEntry[]>();
  for (const cmd of newCommands) {
    const key = `${cmd.source}-${cmd.senderId}`;
    if (!sessionGroups.has(key)) {
      sessionGroups.set(key, []);
    }
    sessionGroups.get(key)!.push(cmd);
  }
  
  // Log session activity if significant (avoid spam)
  // Only log if we have new sessions AND it's been at least 1 hour since last session log
  const SESSION_LOG_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
  const lastSessionActivity = activities.filter(a => a.type === 'session').pop();
  const timeSinceLastSessionLog = lastSessionActivity 
    ? now.getTime() - new Date(lastSessionActivity.timestamp).getTime()
    : Infinity;
  
  if (sessionGroups.size > 0 && timeSinceLastSessionLog > SESSION_LOG_INTERVAL_MS) {
    // Summarize session activity
    const sources = new Set<string>();
    let totalInteractions = 0;
    
    for (const [key, cmds] of sessionGroups) {
      const source = cmds[0].source;
      sources.add(source);
      totalInteractions += cmds.length;
    }
    
    const sourceList = Array.from(sources).join(', ');
    
    const sessionActivity: Activity = {
      timestamp: now.toISOString(),
      type: 'session',
      description: `Agent session activity: ${totalInteractions} interactions via ${sourceList}`,
      metadata: {
        sources: Array.from(sources),
        interactionCount: totalInteractions,
        uniqueSessions: sessionGroups.size,
        presenceCount: presence.length,
        cronJobsActive: cronInfo.jobs,
        periodMinutes: Math.floor((now.getTime() - lastCheckTime) / 60000)
      }
    };
    
    activities.push(sessionActivity);
    saveActivities(activities);
    
    state.totalSessions += sessionGroups.size;
    console.log(`✅ Logged session activity: ${totalInteractions} interactions`);
  } else if (sessionGroups.size > 0) {
    console.log(`⏭️ Skipping session log (last log: ${Math.floor(timeSinceLastSessionLog / 60000)}min ago)`);
  } else {
    console.log('ℹ️ No new session activity to log');
  }
  
  // Update state
  state.lastCheck = now.toISOString();
  saveState(state);
}

main().catch(console.error);
