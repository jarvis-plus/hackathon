#!/usr/bin/env bun
/**
 * Calendar Tracker - Logs calendar events involving the agent
 * 
 * Automatically polls Google Calendar for upcoming events and logs them
 * as activities. Tracks events where the agent (or Souren) is organizer/attendee.
 * 
 * Usage:
 *   bun run collectors/calendar-tracker.ts          # Check for upcoming events
 *   bun run collectors/calendar-tracker.ts --force  # Re-check all events (next 14 days)
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
  type CalendarState,
  type CalendarMetadata,
  loadActivities,
  saveActivities,
  loadState as loadGenericState,
  saveState as saveGenericState,
  truncate,
} from './types.js';

const STATE_FILE = join(import.meta.dir, 'calendar-state.json');
const ACCOUNTS = ['jarvis@avo.so', 'souren@avo.so'];

const DEFAULT_STATE: CalendarState = {
  lastCheck: new Date().toISOString(),
  knownEventIds: [],
  totalEvents: 0,
};

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  organizer?: {
    email: string;
    self?: boolean;
  };
  attendees?: Array<{
    email: string;
    responseStatus?: string;
    self?: boolean;
    organizer?: boolean;
  }>;
  htmlLink?: string;
  location?: string;
  hangoutLink?: string;
  status?: string;
  created?: string;
  updated?: string;
}

interface CalendarEventsResult {
  events: CalendarEvent[];
  nextPageToken?: string;
}

function loadState(): CalendarState {
  return loadGenericState(STATE_FILE, DEFAULT_STATE);
}

function saveState(state: CalendarState): void {
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
 * Execute gog calendar command with proper environment
 */
function gogCalendar(args: string, account: string): string {
  const password = getKeyringPassword();
  const cmd = `GOG_KEYRING_BACKEND=file GOG_KEYRING_PASSWORD="${password}" gog calendar ${args} --account ${account}`;
  
  try {
    return execSync(cmd, { encoding: 'utf-8', timeout: 30000 });
  } catch (err: unknown) {
    const error = err as { stderr?: string };
    console.error('❌ gog calendar command failed:', error.stderr || err);
    throw err;
  }
}

/**
 * Get calendar events for the next N days
 */
function getUpcomingEvents(account: string, days: number = 7): CalendarEvent[] {
  try {
    const output = gogCalendar(`events --days ${days} --max 20 --json`, account);
    const result: CalendarEventsResult = JSON.parse(output);
    return result.events || [];
  } catch (err) {
    console.error(`❌ Failed to fetch calendar events for ${account}`);
    return [];
  }
}

/**
 * Format event time for display
 */
function formatEventTime(event: CalendarEvent): string {
  const start = event.start.dateTime || event.start.date;
  if (!start) return 'Unknown time';
  
  const date = new Date(start);
  const isAllDay = !event.start.dateTime;
  
  if (isAllDay) {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Get attendee count
 */
function getAttendeeCount(event: CalendarEvent): number {
  return event.attendees?.length || 1;
}

/**
 * Get organizer email
 */
function getOrganizer(event: CalendarEvent): string {
  return event.organizer?.email || 'unknown';
}

/**
 * Main tracking function - check for upcoming calendar events
 */
export async function trackCalendar(force = false): Promise<void> {
  const state = loadState();
  const activities = loadActivities();
  const now = new Date();
  
  console.log('📅 Calendar Tracker starting...');
  console.log(`   Last check: ${state.lastCheck}`);
  console.log(`   Known events: ${state.knownEventIds.length}`);
  
  let newCount = 0;
  const allEvents: CalendarEvent[] = [];
  
  // Fetch events from all configured accounts
  for (const account of ACCOUNTS) {
    console.log(`   Checking ${account}...`);
    const events = getUpcomingEvents(account, force ? 14 : 7);
    console.log(`   Found ${events.length} events`);
    allEvents.push(...events);
  }
  
  // Deduplicate by event ID (same event might appear in multiple accounts)
  const seenIds = new Set<string>();
  const uniqueEvents = allEvents.filter(event => {
    if (seenIds.has(event.id)) return false;
    seenIds.add(event.id);
    return true;
  });
  
  console.log(`   Total unique events: ${uniqueEvents.length}`);
  
  for (const event of uniqueEvents) {
    // Skip if already known
    if (state.knownEventIds.includes(event.id)) {
      continue;
    }
    
    // Skip cancelled events
    if (event.status === 'cancelled') {
      continue;
    }
    
    // Get event start time
    const startTime = event.start.dateTime || event.start.date;
    if (!startTime) continue;
    
    const eventDate = new Date(startTime);
    const isAllDay = !event.start.dateTime;
    const summary = event.summary || '(No title)';
    const timeDisplay = formatEventTime(event);
    
    // Create activity
    const activity: Activity = {
      timestamp: event.created || now.toISOString(),
      type: 'calendar',
      description: `📅 Event: "${truncate(summary, 50)}" on ${timeDisplay}`,
      metadata: {
        eventId: event.id,
        title: summary,
        startTime: startTime,
        endTime: event.end.dateTime || event.end.date || startTime,
        isAllDay,
        organizer: getOrganizer(event),
        attendeeCount: getAttendeeCount(event),
        location: event.location,
        meetingLink: event.hangoutLink,
        calendarLink: event.htmlLink,
      } as CalendarMetadata,
    };
    
    activities.push(activity);
    state.knownEventIds.push(event.id);
    state.totalEvents++;
    newCount++;
    
    console.log(`   ✅ Logged: ${truncate(summary, 40)}`);
  }
  
  // Update state
  state.lastCheck = now.toISOString();
  
  // Keep only last 200 known event IDs to prevent state bloat
  if (state.knownEventIds.length > 200) {
    state.knownEventIds = state.knownEventIds.slice(-200);
  }
  
  saveState(state);
  
  if (newCount > 0) {
    saveActivities(activities);
    console.log(`\n📅 Calendar tracking complete: ${newCount} new events logged`);
    console.log(`   Total events tracked: ${state.totalEvents}`);
  } else {
    console.log('\n📅 Calendar tracking complete: No new events');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
📅 Calendar Tracker - Log calendar events involving the agent

Usage:
  bun run collectors/calendar-tracker.ts          # Check for upcoming events (next 7 days)
  bun run collectors/calendar-tracker.ts --force  # Re-check all events (next 14 days)

Tracks:
  - Events from ${ACCOUNTS.join(', ')}
  - Logs event title, time, attendees, meeting links
  - Deduplicates based on event ID

State file: ${STATE_FILE}
`);
    return;
  }
  
  const force = args.includes('--force');
  await trackCalendar(force);
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}
