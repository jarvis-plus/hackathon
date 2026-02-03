#!/usr/bin/env bun
/**
 * Heartbeat Tracker - Records agent uptime and health status
 * Runs via cron to prove continuous operation during hackathon
 * 
 * Creates periodic "heartbeat" entries showing:
 * - Agent is alive and processing
 * - System health (gateway, services)
 * - Time since last activity
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ACTIVITY_FILE = join(import.meta.dir, '../activity.json');
const STATE_FILE = join(import.meta.dir, 'heartbeat-state.json');

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
}

interface HeartbeatState {
  lastHeartbeat: string | null;
  consecutiveBeats: number;
  totalBeats: number;
}

function loadState(): HeartbeatState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return { lastHeartbeat: null, consecutiveBeats: 0, totalBeats: 0 };
}

function saveState(state: HeartbeatState) {
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

function checkGatewayStatus(): { running: boolean; uptime?: string; details?: string } {
  try {
    const output = execSync('openclaw gateway status 2>&1', { encoding: 'utf-8' });
    
    // Multiple indicators of gateway health
    const indicators = {
      runtimeRunning: output.includes('Runtime: running'),
      rpcOk: output.includes('RPC probe: ok'),
      listening: output.includes('Listening') || output.includes('listening'),
      connected: output.includes('connected') || output.includes('Connected'),
    };
    
    // Gateway is running if any positive indicator is present and no error indicators
    const hasErrors = output.toLowerCase().includes('error') || 
                     output.toLowerCase().includes('failed') ||
                     output.toLowerCase().includes('not running');
    
    const running = !hasErrors && (
      indicators.runtimeRunning || 
      indicators.rpcOk || 
      indicators.listening || 
      indicators.connected
    );
    
    // Extract uptime if available
    const uptimeMatch = output.match(/uptime[:\s]+(\d+[hms\s]+)/i);
    const uptime = uptimeMatch ? uptimeMatch[1].trim() : undefined;
    
    return { 
      running, 
      uptime,
      details: `rpc=${indicators.rpcOk ? 'ok' : 'no'} runtime=${indicators.runtimeRunning ? 'ok' : 'no'}`
    };
  } catch (e) {
    // Try alternative check - is the gateway process running?
    try {
      const ps = execSync('pgrep -f "openclaw gateway" || echo "none"', { encoding: 'utf-8' }).trim();
      if (ps !== 'none' && ps.length > 0) {
        return { running: true, details: 'process-found' };
      }
    } catch {}
    return { running: false, details: 'check-failed' };
  }
}

function checkSystemHealth(): { gateway: boolean; dashboard: boolean; memory: string } {
  const gateway = checkGatewayStatus();
  
  // Check if dashboard is running (port 3456)
  let dashboard = false;
  try {
    const httpCode = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/api/activities 2>/dev/null', { encoding: 'utf-8' }).trim();
    dashboard = httpCode === '200';
  } catch {
    dashboard = false;
  }
  
  // Get memory usage
  let memory = 'unknown';
  try {
    const memInfo = execSync('free -h | grep Mem | awk \'{print $3 "/" $2}\'', { encoding: 'utf-8' }).trim();
    memory = memInfo;
  } catch {}
  
  return { gateway: gateway.running, dashboard, memory };
}

function getTimeSinceLastActivity(activities: Activity[]): { minutes: number; lastType?: string } {
  if (activities.length === 0) return { minutes: -1 };
  
  const last = activities[activities.length - 1];
  const lastTime = new Date(last.timestamp).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - lastTime) / 60000);
  
  return { minutes, lastType: last.type };
}

async function main() {
  console.log('\n💓 Heartbeat Tracker');
  
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  // Check if we should log a heartbeat
  // Only log every 4 hours to avoid spam (but track internally more often)
  const HEARTBEAT_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 hours
  
  if (state.lastHeartbeat) {
    const lastBeat = new Date(state.lastHeartbeat).getTime();
    const timeSinceLastBeat = now.getTime() - lastBeat;
    
    if (timeSinceLastBeat < HEARTBEAT_INTERVAL_MS) {
      console.log(`⏭️ Skipping heartbeat (last: ${Math.floor(timeSinceLastBeat / 60000)}min ago, interval: ${HEARTBEAT_INTERVAL_MS / 3600000}h)`);
      // Still update consecutive count
      state.consecutiveBeats++;
      saveState(state);
      return;
    }
  }
  
  // Run health checks
  const health = checkSystemHealth();
  const lastActivity = getTimeSinceLastActivity(activities);
  
  // Determine status
  let status = 'active';
  if (lastActivity.minutes > 60) status = 'idle';
  if (!health.gateway) status = 'degraded';
  
  // Create heartbeat activity
  const heartbeat: Activity = {
    timestamp: now.toISOString(),
    type: 'heartbeat',
    description: `Agent heartbeat #${state.totalBeats + 1} - Status: ${status.toUpperCase()}`,
    metadata: {
      status,
      health: {
        gateway: health.gateway,
        dashboard: health.dashboard,
        memory: health.memory
      },
      lastActivityMinutesAgo: lastActivity.minutes,
      lastActivityType: lastActivity.lastType,
      consecutiveBeats: state.consecutiveBeats + 1,
      totalBeats: state.totalBeats + 1,
      uptimeHours: state.lastHeartbeat 
        ? Math.floor((now.getTime() - new Date(state.lastHeartbeat).getTime()) / 3600000)
        : 0
    }
  };
  
  activities.push(heartbeat);
  saveActivities(activities);
  
  // Update state
  state.lastHeartbeat = now.toISOString();
  state.consecutiveBeats++;
  state.totalBeats++;
  saveState(state);
  
  console.log(`✅ Heartbeat logged: ${status.toUpperCase()}`);
  console.log(`   Gateway: ${health.gateway ? '✓' : '✗'} | Dashboard: ${health.dashboard ? '✓' : '✗'} | Memory: ${health.memory}`);
  console.log(`   Total heartbeats: ${state.totalBeats}`);
}

main().catch(console.error);
