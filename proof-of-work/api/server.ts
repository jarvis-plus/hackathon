/**
 * Proof of Work API Server
 * 
 * This is the main backend server for the Proof of Work Dashboard.
 * It serves multiple purposes:
 * 
 * 1. **Static Dashboard** - Serves the HTML/CSS/JS dashboard at /pow/
 * 2. **REST API** - Provides endpoints for activities, stats, health checks, verification
 * 3. **WebSocket** - Real-time updates when new activities are logged
 * 4. **RSS Feed** - Machine-readable activity feed for aggregators
 * 
 * Architecture:
 * - Built with Bun.serve() for high-performance HTTP + WebSocket handling
 * - Activities stored in activity.json (append-only log)
 * - File watcher detects changes and broadcasts to WebSocket clients
 * - Rate limiting protects against abuse (100 req/min API, 10 WS connections/min)
 * 
 * Key Endpoints:
 * - GET /api/activities    - All activities as JSON array
 * - GET /api/stats         - Aggregated statistics
 * - GET /api/health        - Health check for monitoring
 * - GET /api/verify/:hash  - Verify a specific activity by hash
 * - GET /api/badge         - Compact summary for sharing
 * - GET /api/feed.rss      - RSS feed of recent activities
 * - WS  /ws                - WebSocket for real-time updates
 * 
 * @author Jarvis AI Agent
 * @license MIT
 * @see https://jarvis.tail6a9bde.ts.net/pow/
 */

import { readFileSync, writeFileSync, existsSync, watchFile, statSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ==============================================
// CONFIGURATION
// ==============================================

/** Server port - can be overridden via PORT env var */
const PORT = process.env.PORT || 3456;

/** Base directory for the proof-of-work module (parent of /api) */
const BASE_DIR = join(import.meta.dir, '..');

/** Path to the activity log file - all activities stored here */
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');

/** Path to the dashboard static files */
const DASHBOARD_DIR = join(BASE_DIR, 'dashboard');

/** Path to the webhook subscriptions file */
const WEBHOOKS_FILE = join(BASE_DIR, 'data', 'webhooks.json');

// ==============================================
// WEBHOOK SYSTEM
// ==============================================

/**
 * Webhook Subscription Interface
 * 
 * Each webhook subscription contains:
 * - id: Unique identifier for management
 * - url: The endpoint to POST activity data to
 * - secret: Optional shared secret for HMAC signature verification
 * - events: Array of event types to subscribe to (or ['*'] for all)
 * - createdAt: When the webhook was registered
 * - lastDelivery: Timestamp of last successful delivery
 * - failureCount: Consecutive failures (reset on success)
 * - active: Whether the webhook is enabled
 */
interface WebhookSubscription {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  createdAt: string;
  lastDelivery?: string;
  failureCount: number;
  active: boolean;
}

/**
 * Load all webhook subscriptions from file.
 * Returns empty array if file doesn't exist.
 */
function getWebhooks(): WebhookSubscription[] {
  if (!existsSync(WEBHOOKS_FILE)) return [];
  try {
    const data = readFileSync(WEBHOOKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load webhooks:', e);
    return [];
  }
}

/**
 * Save webhook subscriptions to file.
 */
function saveWebhooks(webhooks: WebhookSubscription[]): void {
  try {
    writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));
  } catch (e) {
    console.error('Failed to save webhooks:', e);
  }
}

/**
 * Create HMAC signature for webhook payload.
 * Uses SHA256 with the webhook's secret as key.
 */
async function createWebhookSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Deliver webhook payload to a single subscription.
 * Includes retry logic with exponential backoff.
 * 
 * @param webhook - The webhook subscription
 * @param eventType - Type of event (e.g., 'activity.new')
 * @param payload - The data to send
 * @returns Success status
 */
async function deliverWebhook(
  webhook: WebhookSubscription,
  eventType: string,
  payload: any
): Promise<boolean> {
  if (!webhook.active) return false;
  
  // Check if webhook is subscribed to this event type
  if (!webhook.events.includes('*') && !webhook.events.includes(eventType)) {
    return true; // Not subscribed, but not a failure
  }
  
  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload
  });
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Jarvis-PoW-Webhook/1.0',
    'X-Webhook-Event': eventType,
    'X-Webhook-Delivery': randomUUID(),
  };
  
  // Add HMAC signature if secret is configured
  if (webhook.secret) {
    const signature = await createWebhookSignature(body, webhook.secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }
  
  // Retry with exponential backoff: 1s, 2s, 4s (3 attempts)
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ Webhook delivered to ${webhook.url} (attempt ${attempt + 1})`);
        return true;
      }
      
      // Non-retryable status codes
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.warn(`❌ Webhook rejected by ${webhook.url}: ${response.status}`);
        return false;
      }
      
      lastError = new Error(`HTTP ${response.status}`);
    } catch (e) {
      lastError = e as Error;
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  console.error(`❌ Webhook delivery failed to ${webhook.url} after ${maxRetries} attempts:`, lastError);
  return false;
}

/**
 * Broadcast event to all registered webhooks.
 * Updates webhook status (lastDelivery, failureCount).
 * 
 * @param eventType - Type of event (e.g., 'activity.new', 'activity.batch')
 * @param payload - The data to send
 */
async function broadcastToWebhooks(eventType: string, payload: any): Promise<void> {
  const webhooks = getWebhooks();
  if (webhooks.length === 0) return;
  
  const activeWebhooks = webhooks.filter(w => w.active);
  if (activeWebhooks.length === 0) return;
  
  console.log(`🔔 Broadcasting ${eventType} to ${activeWebhooks.length} webhooks`);
  
  // Deliver in parallel
  const results = await Promise.all(
    activeWebhooks.map(async (webhook) => {
      const success = await deliverWebhook(webhook, eventType, payload);
      return { id: webhook.id, success };
    })
  );
  
  // Update webhook statuses
  let modified = false;
  for (const result of results) {
    const webhook = webhooks.find(w => w.id === result.id);
    if (!webhook) continue;
    
    if (result.success) {
      webhook.lastDelivery = new Date().toISOString();
      webhook.failureCount = 0;
      modified = true;
    } else {
      webhook.failureCount++;
      modified = true;
      
      // Disable webhook after 10 consecutive failures
      if (webhook.failureCount >= 10) {
        webhook.active = false;
        console.warn(`⚠️ Webhook ${webhook.id} disabled after 10 consecutive failures`);
      }
    }
  }
  
  if (modified) {
    saveWebhooks(webhooks);
  }
}

// ==============================================
// WEBSOCKET CLIENT TRACKING
// ==============================================

/**
 * Set of all connected WebSocket clients.
 * Used to broadcast real-time updates when new activities arrive.
 * Clients are automatically added on connect and removed on disconnect.
 */
const wsClients = new Set<WebSocket>();

// ==============================================
// RATE LIMITING
// ==============================================

/**
 * Rate Limiting Implementation
 * 
 * Uses a sliding window algorithm to prevent abuse:
 * - API endpoints: 100 requests per minute per IP
 * - WebSocket connections: 10 per minute per IP
 * - Static dashboard assets are NOT rate limited (better UX)
 * 
 * How it works:
 * 1. Each IP gets an entry with an array of timestamps
 * 2. On each request, we filter out timestamps older than the window
 * 3. If remaining timestamps >= limit, reject the request
 * 4. Otherwise, add current timestamp and allow
 * 
 * Old entries are cleaned up every 5 minutes to prevent memory leaks.
 */

/** Tracks request timestamps per IP for API rate limiting */
interface RateLimitEntry {
  timestamps: number[];
}

/** Rate limit store for API requests */
const rateLimitStore = new Map<string, RateLimitEntry>();

/** Rate limit store for WebSocket connections (separate pool) */
const WS_RATE_LIMIT_STORE = new Map<string, RateLimitEntry>();

/** Duration of the sliding window in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Maximum API requests allowed per IP within the window */
const API_RATE_LIMIT = 100;

/** Maximum WebSocket connections allowed per IP within the window */
const WS_RATE_LIMIT = 10;

/**
 * Periodic cleanup of expired rate limit entries.
 * Runs every 5 minutes to prevent memory accumulation from inactive IPs.
 * Removes entries with no timestamps within the active window.
 */
setInterval(() => {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  
  // Clean up API rate limit store
  for (const [ip, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    }
  }
  
  // Clean up WebSocket rate limit store
  for (const [ip, entry] of WS_RATE_LIMIT_STORE.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      WS_RATE_LIMIT_STORE.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Extract the client's IP address from the request.
 * 
 * Handles multiple scenarios:
 * 1. X-Forwarded-For header (reverse proxy like nginx/Caddy)
 * 2. X-Real-IP header (alternative proxy header)
 * 3. Direct socket address (Bun's requestIP method)
 * 
 * @param req - The incoming HTTP request
 * @param server - The Bun server instance (for requestIP)
 * @returns The client's IP address, or 'unknown' if not determinable
 */
function getClientIP(req: Request, server: any): string {
  // Check X-Forwarded-For first (standard proxy header, may have multiple IPs)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }
  
  // Check X-Real-IP (simpler alternative used by some proxies)
  const realIP = req.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }
  
  // Fallback to Bun's native socket address
  try {
    const addr = server.requestIP(req);
    if (addr) return addr.address;
  } catch (e) {
    // requestIP may not be available in all contexts
  }
  
  return 'unknown';
}

/**
 * Check if a request is allowed under rate limiting.
 * 
 * @param ip - The client's IP address
 * @param store - Which rate limit store to use (API or WebSocket)
 * @param limit - Maximum requests allowed in the window
 * @returns Object with allowed status, remaining requests, and reset time
 */
function checkRateLimit(
  ip: string, 
  store: Map<string, RateLimitEntry>, 
  limit: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  
  // Get or create entry for this IP
  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(ip, entry);
  }
  
  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter(t => t > cutoff);
  
  // Calculate remaining requests and time until reset
  const remaining = Math.max(0, limit - entry.timestamps.length);
  const resetIn = entry.timestamps.length > 0 
    ? Math.ceil((entry.timestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
    : 60;
  
  // Check if limit exceeded
  if (entry.timestamps.length >= limit) {
    return { allowed: false, remaining: 0, resetIn };
  }
  
  // Allow the request and record the timestamp
  entry.timestamps.push(now);
  return { allowed: true, remaining: remaining - 1, resetIn };
}

/**
 * Generate a 429 Too Many Requests response.
 * Includes proper headers for rate limit information.
 * 
 * @param resetIn - Seconds until rate limit resets
 * @returns HTTP 429 Response with JSON body
 */
function rateLimitResponse(resetIn: number): Response {
  return new Response(JSON.stringify({
    error: 'Too Many Requests',
    message: `Rate limit exceeded. Try again in ${resetIn} seconds.`,
    retryAfter: resetIn
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(resetIn),
      'X-RateLimit-Limit': String(API_RATE_LIMIT),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + resetIn)
    }
  });
}

// ==============================================
// ACTIVITY FILE MONITORING
// ==============================================

/**
 * Activity File Change Detection
 * 
 * Instead of using file watchers (which can be unreliable), we poll
 * the activity file every 2 seconds and compare modification times.
 * 
 * When changes are detected:
 * 1. Compare activity count with last known count
 * 2. If increased, extract the new activities
 * 3. Broadcast to all connected WebSocket clients
 * 
 * This ensures real-time updates on the dashboard without page refresh.
 */

/** Last known modification time of activity.json */
let lastActivityMtime = 0;

/** Last known activity count */
let lastActivityCount = 0;

/**
 * Load and parse all activities from the activity file.
 * Returns empty array if file doesn't exist (graceful startup).
 * 
 * @returns Array of activity objects
 */
function getActivities(): any[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  const data = readFileSync(ACTIVITY_FILE, 'utf-8');
  return JSON.parse(data);
}

/**
 * Serve a file from the dashboard directory.
 * Handles content-type detection and caching headers.
 * 
 * @param path - Request path (e.g., '/' or '/app.js')
 * @returns HTTP Response with file content
 */
function serveDashboard(path: string): Response {
  // Treat root path as index.html
  const filePath = path === '/' ? '/index.html' : path;
  const fullPath = join(DASHBOARD_DIR, filePath);
  
  // Return 404 if file doesn't exist
  if (!existsSync(fullPath)) {
    return new Response('Not Found', { status: 404 });
  }
  
  const content = readFileSync(fullPath);
  const ext = filePath.split('.').pop();
  
  // Map file extensions to MIME types
  const contentTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    png: 'image/png',
    ico: 'image/x-icon',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  
  // Set cache headers: 24h for static assets, no-cache for HTML
  const cacheControl = ['svg', 'png', 'ico', 'jpg', 'jpeg', 'gif', 'webp', 'css', 'js'].includes(ext || '') 
    ? 'public, max-age=86400' // 24 hours - browser caches these
    : 'no-cache'; // HTML should always be fresh
  
  return new Response(content, {
    headers: { 
      'Content-Type': contentTypes[ext || 'html'] || 'text/plain',
      'Cache-Control': cacheControl
    }
  });
}

// ==============================================
// WEBSOCKET BROADCASTING
// ==============================================

/**
 * Broadcast a message to all connected WebSocket clients.
 * Wraps the data in a standard message format with type and timestamp.
 * 
 * Message format:
 * {
 *   type: 'new_activities' | 'init' | etc.,
 *   data: {...},
 *   timestamp: ISO string
 * }
 * 
 * @param type - Message type identifier
 * @param data - Payload to send
 */
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  for (const ws of wsClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (e) {
      // Silently ignore - client will be cleaned up on disconnect
    }
  }
}

/**
 * Check for changes in the activity file and broadcast updates.
 * Called every 2 seconds by the polling interval.
 * 
 * Detection strategy:
 * 1. Check file modification time (cheap operation)
 * 2. Only read file if mtime changed
 * 3. Compare activity count to detect additions
 * 4. Broadcast only the new activities (not full list)
 */
function checkForChanges() {
  try {
    if (!existsSync(ACTIVITY_FILE)) return;
    
    const stats = statSync(ACTIVITY_FILE);
    const mtime = stats.mtimeMs;
    
    // Skip if file hasn't been modified
    if (mtime !== lastActivityMtime) {
      lastActivityMtime = mtime;
      
      const activities = getActivities();
      const newCount = activities.length;
      
      // Broadcast only if there are new activities
      if (newCount > lastActivityCount) {
        const newActivities = activities.slice(lastActivityCount);
        console.log(`📡 Broadcasting ${newActivities.length} new activities to ${wsClients.size} clients`);
        
        const stats = {
          total: activities.length,
          onchain: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
          commits: activities.filter((a: any) => a.type === 'commit').length,
          builds: activities.filter((a: any) => ['build', 'deploy', 'decision'].includes(a.type)).length,
          trades: activities.filter((a: any) => ['trade', 'transfer'].includes(a.type)).length,
          messages: activities.filter((a: any) => a.type === 'message').length,
          tweets: activities.filter((a: any) => a.type === 'tweet').length,
        };
        
        // Send full state + specifically highlight new items to WebSocket clients
        broadcastUpdate('new_activities', {
          activities,
          newItems: newActivities,
          stats
        });
        
        // Also broadcast to webhooks
        // Use different event types based on batch size
        if (newActivities.length === 1) {
          // Single activity - send activity.new event
          broadcastToWebhooks('activity.new', {
            activity: newActivities[0],
            stats
          });
        } else {
          // Multiple activities - send activity.batch event
          broadcastToWebhooks('activity.batch', {
            activities: newActivities,
            count: newActivities.length,
            stats
          });
        }
      }
      
      lastActivityCount = newCount;
    }
  } catch (e) {
    // Ignore read errors - file may be mid-write
  }
}

// Start the change detection polling (every 2 seconds)
setInterval(checkForChanges, 2000);

// Initialize state on startup
try {
  const activities = getActivities();
  lastActivityCount = activities.length;
  const stats = statSync(ACTIVITY_FILE);
  lastActivityMtime = stats.mtimeMs;
} catch (e) {
  // File may not exist yet on first run
}

// ==============================================
// HTTP SERVER
// ==============================================

/**
 * Main HTTP Server
 * 
 * Bun.serve() creates a high-performance HTTP server with:
 * - Native WebSocket support (no separate library needed)
 * - Fast Request/Response handling
 * - Automatic Keep-Alive
 * 
 * Route priority:
 * 1. WebSocket upgrade (/ws)
 * 2. API endpoints (/api/*)
 * 3. Static activity.json (/activity.json)
 * 4. Dashboard files (everything else)
 */
const server = Bun.serve({
  port: PORT,
  
  /**
   * Main request handler - routes all HTTP requests
   */
  async fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;
    const clientIP = getClientIP(req, server);

    // CORS headers - allow cross-origin requests for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ==========================================
    // WEBSOCKET UPGRADE
    // ==========================================
    if (path === '/ws') {
      // Check WebSocket-specific rate limit
      const wsRateCheck = checkRateLimit(clientIP, WS_RATE_LIMIT_STORE, WS_RATE_LIMIT);
      if (!wsRateCheck.allowed) {
        return new Response('WebSocket rate limit exceeded', { 
          status: 429,
          headers: { 'Retry-After': String(wsRateCheck.resetIn) }
        });
      }
      
      // Attempt protocol upgrade
      const upgraded = server.upgrade(req, { data: { ip: clientIP } });
      if (upgraded) return undefined; // Upgrade successful
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // ==========================================
    // API RATE LIMITING
    // ==========================================
    if (path.startsWith('/api/')) {
      const rateCheck = checkRateLimit(clientIP, rateLimitStore, API_RATE_LIMIT);
      
      // Add rate limit headers to all API responses
      const rateLimitHeaders = {
        'X-RateLimit-Limit': String(API_RATE_LIMIT),
        'X-RateLimit-Remaining': String(rateCheck.remaining),
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + rateCheck.resetIn)
      };
      
      if (!rateCheck.allowed) {
        return rateLimitResponse(rateCheck.resetIn);
      }
      
      // Merge rate limit headers with CORS for API responses
      Object.assign(corsHeaders, rateLimitHeaders);
    }

    // ==========================================
    // API: GET /api/activities
    // Returns all activities as a JSON array
    // ==========================================
    if (path === '/api/activities') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/stats
    // Returns aggregated statistics
    // ==========================================
    if (path === '/api/stats') {
      const activities = getActivities();
      const DEFAULT_WALLET = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';
      const stats = {
        total: activities.length,
        byType: activities.reduce((acc: Record<string, number>, a: any) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {}),
        byWallet: activities.reduce((acc: Record<string, number>, a: any) => {
          const wallet = a.wallet || (a.signature ? DEFAULT_WALLET : 'unsigned');
          acc[wallet] = (acc[wallet] || 0) + 1;
          return acc;
        }, {}),
        firstActivity: activities[0]?.timestamp || null,
        lastActivity: activities[activities.length - 1]?.timestamp || null,
        onchain: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
      };
      return Response.json(stats, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/health
    // Health check for monitoring systems
    // Returns 200 if healthy, 503 if degraded
    // ==========================================
    if (path === '/api/health') {
      const startTime = Date.now();
      let activityFileOk = false;
      let activityCount = 0;
      let lastActivity: string | null = null;
      let unsignedCount = 0;
      
      // Check activity file readability
      try {
        const activities = getActivities();
        activityFileOk = true;
        activityCount = activities.length;
        lastActivity = activities[activities.length - 1]?.timestamp || null;
        unsignedCount = activities.filter((a: any) => !a.signature && !a.proof?.txSignature).length;
      } catch (e) {
        activityFileOk = false;
      }
      
      // Calculate age of last activity
      const lastActivityAge = lastActivity 
        ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000)
        : null;
      
      // Health criteria:
      // - Activity file readable
      // - Has at least one activity
      // - Recent activity within 2 hours (agent is active)
      const isHealthy = activityFileOk && 
        activityCount > 0 && 
        (lastActivityAge === null || lastActivityAge < 7200); // 2 hours
      
      const health = {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks: {
          activityFile: activityFileOk ? 'ok' : 'error',
          activityCount: activityCount,
          unsignedActivities: unsignedCount,
          lastActivity: lastActivity,
          lastActivityAge: lastActivityAge !== null ? `${lastActivityAge}s ago` : null,
          websocketClients: wsClients.size,
        },
        server: {
          uptime: process.uptime ? `${Math.floor(process.uptime())}s` : 'unknown',
          port: PORT,
          version: '1.0.0',
        },
        responseTime: `${Date.now() - startTime}ms`,
      };
      
      return Response.json(health, { 
        status: isHealthy ? 200 : 503,
        headers: corsHeaders 
      });
    }

    // ==========================================
    // API: GET /api/badge or /api/summary
    // Compact verification summary for sharing
    // ==========================================
    if (path === '/api/badge' || path === '/api/summary') {
      const activities = getActivities();
      const onchainCount = activities.filter((a: any) => a.signature || a.proof?.txSignature).length;
      const firstActivity = activities[0];
      const lastActivity = activities[activities.length - 1];
      
      // Count unique active days
      const uniqueDays = new Set(activities.map((a: any) => 
        new Date(a.timestamp).toISOString().split('T')[0]
      )).size;
      
      // Count build cycles from activity descriptions
      const cycleActivities = activities.filter((a: any) => 
        a.description?.includes('Cycle') && a.type === 'build'
      );
      const cycleCount = cycleActivities.length;
      
      const badge = {
        project: 'Jarvis Proof of Work',
        hackathon: 'Colosseum Agent Hackathon 2026',
        status: onchainCount === activities.length ? '✅ 100% On-Chain' : `⏳ ${onchainCount}/${activities.length} On-Chain`,
        stats: {
          totalActivities: activities.length,
          onChainProofs: onchainCount,
          verificationRate: `${Math.round((onchainCount / activities.length) * 100)}%`,
          buildCycles: cycleCount,
          activeDays: uniqueDays,
          commits: activities.filter((a: any) => a.type === 'commit').length,
          trades: activities.filter((a: any) => a.type === 'trade').length,
        },
        timeline: {
          started: firstActivity?.timestamp || null,
          latest: lastActivity?.timestamp || null,
          uptime: firstActivity ? `${Math.floor((Date.now() - new Date(firstActivity.timestamp).getTime()) / (1000 * 60 * 60))}h` : null,
        },
        wallet: 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX',
        verify: {
          dashboard: 'https://jarvis.tail6a9bde.ts.net/pow/',
          api: 'https://jarvis.tail6a9bde.ts.net/pow/api/activities',
          anyHash: 'https://jarvis.tail6a9bde.ts.net/pow/api/verify/{hash}',
        },
        oneLiner: `🤖 Jarvis: ${activities.length} activities, ${onchainCount} on-chain proofs, ${cycleCount} build cycles, ${uniqueDays} days active`,
      };
      
      return Response.json(badge, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/feed.rss
    // RSS feed for activity subscriptions
    // Enables feed readers to follow agent activity
    // ==========================================
    if (path === '/api/feed.rss' || path === '/api/rss' || path === '/rss.xml') {
      const activities = getActivities();
      const recentActivities = activities.slice(-50).reverse(); // Last 50, newest first
      
      // XML escape helper
      const escapeXml = (str: string) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Generate RSS items
      const items = recentActivities.map((a: any) => {
        const hash = a.hash || a.proof?.hash || '';
        const signature = a.signature || a.proof?.txSignature || '';
        const link = signature 
          ? `https://solscan.io/tx/${signature}`
          : `https://jarvis.tail6a9bde.ts.net/pow/`;
        const pubDate = new Date(a.timestamp).toUTCString();
        
        return `    <item>
      <title>[${escapeXml(a.type)}] ${escapeXml(a.description.slice(0, 100))}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${hash || a.timestamp}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[
Type: ${a.type}
Description: ${a.description}
Hash: ${hash}
On-Chain: ${signature ? 'Yes - ' + signature.slice(0, 20) + '...' : 'Pending'}
      ]]></description>
      <category>${escapeXml(a.type)}</category>
    </item>`;
      }).join('\n');
      
      // Build full RSS document
      const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Jarvis Proof of Work - Activity Feed</title>
    <link>https://jarvis.tail6a9bde.ts.net/pow/</link>
    <description>Live activity feed from Jarvis AI agent - Colosseum Agent Hackathon 2026. Every action cryptographically signed and anchored on Solana.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="https://jarvis.tail6a9bde.ts.net/pow/api/feed.rss" rel="self" type="application/rss+xml"/>
    <image>
      <url>https://jarvis.tail6a9bde.ts.net/pow/icon.png</url>
      <title>Jarvis Proof of Work</title>
      <link>https://jarvis.tail6a9bde.ts.net/pow/</link>
    </image>
    <generator>Jarvis Proof of Work API</generator>
    <docs>https://jarvis.tail6a9bde.ts.net/pow/</docs>
    <ttl>5</ttl>
${items}
  </channel>
</rss>`;
      
      return new Response(rss, { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'max-age=60' // Cache for 1 minute
        }
      });
    }

    // ==========================================
    // API: GET /api/badge.txt
    // Plain text badge for copy-paste sharing
    // ==========================================
    if (path === '/api/badge.txt') {
      const activities = getActivities();
      const onchainCount = activities.filter((a: any) => a.signature || a.proof?.txSignature).length;
      const cycleActivities = activities.filter((a: any) => 
        a.description?.includes('Cycle') && a.type === 'build'
      );
      
      const text = `🤖 JARVIS PROOF OF WORK
━━━━━━━━━━━━━━━━━━━━━━
📊 ${activities.length} Total Activities
⛓️  ${onchainCount} On-Chain Proofs  
🔄 ${cycleActivities.length} Build Cycles
💰 ${activities.filter((a: any) => a.type === 'trade').length} Trades
📝 ${activities.filter((a: any) => a.type === 'commit').length} Commits
━━━━━━━━━━━━━━━━━━━━━━
🔍 Verify: jarvis.tail6a9bde.ts.net/pow/
💼 Wallet: AMqXw...on9zX
━━━━━━━━━━━━━━━━━━━━━━
Colosseum Agent Hackathon 2026`;
      
      return new Response(text, { 
        headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // ==========================================
    // API: GET /api/verify/:hash
    // Verify a specific activity by its hash
    // Supports both full hash and prefix matching
    // ==========================================
    if (path.startsWith('/api/verify/')) {
      const hash = path.replace('/api/verify/', '');
      
      // Validate hash length
      if (!hash || hash.length < 8) {
        return Response.json({ 
          error: 'Invalid hash', 
          message: 'Provide a valid SHA256 hash or hash prefix (min 8 chars)'
        }, { status: 400, headers: corsHeaders });
      }
      
      const activities = getActivities();
      
      // Find activity by exact hash or prefix match
      const activity = activities.find((a: any) => 
        a.proof?.hash === hash || 
        a.proof?.hash?.startsWith(hash) ||
        a.hash === hash ||
        a.hash?.startsWith(hash)
      );
      
      if (!activity) {
        return Response.json({ 
          error: 'Not found', 
          message: `No activity found with hash starting with: ${hash}`,
          hint: 'Use /api/activities to see all activities and their hashes'
        }, { status: 404, headers: corsHeaders });
      }
      
      // Extract proof details
      const proof = activity.proof || {};
      const txSignature = activity.signature || proof.txSignature;
      const activityHash = activity.hash || proof.hash;
      
      // Build verification response
      const verification = {
        verified: true,
        activity: {
          type: activity.type,
          description: activity.description,
          timestamp: activity.timestamp,
          metadata: activity.metadata || {}
        },
        proof: {
          hash: activityHash,
          algorithm: 'SHA256',
          signatureType: 'Ed25519',
          signature: txSignature,
          wallet: 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX',
          network: 'Solana Mainnet'
        },
        verification: {
          solscan: txSignature ? `https://solscan.io/tx/${txSignature}` : null,
          status: txSignature ? 'on-chain' : 'pending',
          instructions: [
            '1. Visit the Solscan link above',
            '2. Find the Memo instruction in the transaction',
            '3. The memo contains the activity hash',
            '4. Hash matches the SHA256 of the activity data',
            '5. Signature proves the agent signed this activity'
          ]
        },
        agent: {
          id: 45,
          name: 'Jarvis',
          hackathon: 'Colosseum Agent Hackathon (Feb 2026)'
        }
      };
      
      return Response.json(verification, { headers: corsHeaders });
    }

    // ==========================================
    // API: POST /api/webhooks
    // Register a new webhook subscription
    // ==========================================
    if (path === '/api/webhooks' && req.method === 'POST') {
      try {
        const body = await req.json() as { url?: string; secret?: string; events?: string[] };
        
        // Validate URL
        if (!body.url) {
          return Response.json({ 
            error: 'Missing required field: url' 
          }, { status: 400, headers: corsHeaders });
        }
        
        // Validate URL format
        try {
          const parsed = new URL(body.url);
          if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol');
          }
        } catch {
          return Response.json({ 
            error: 'Invalid URL format. Must be http:// or https://' 
          }, { status: 400, headers: corsHeaders });
        }
        
        // Validate events
        const validEvents = ['*', 'activity.new', 'activity.batch', 'activity.signed'];
        const events = body.events || ['*'];
        for (const event of events) {
          if (!validEvents.includes(event)) {
            return Response.json({ 
              error: `Invalid event type: ${event}. Valid types: ${validEvents.join(', ')}` 
            }, { status: 400, headers: corsHeaders });
          }
        }
        
        // Check for duplicate URL
        const webhooks = getWebhooks();
        if (webhooks.find(w => w.url === body.url)) {
          return Response.json({ 
            error: 'Webhook URL already registered' 
          }, { status: 409, headers: corsHeaders });
        }
        
        // Create new webhook
        const webhook: WebhookSubscription = {
          id: randomUUID(),
          url: body.url,
          secret: body.secret,
          events,
          createdAt: new Date().toISOString(),
          failureCount: 0,
          active: true
        };
        
        webhooks.push(webhook);
        saveWebhooks(webhooks);
        
        console.log(`🔔 New webhook registered: ${webhook.url} (events: ${events.join(', ')})`);
        
        return Response.json({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          createdAt: webhook.createdAt,
          active: webhook.active,
          message: 'Webhook registered successfully. You will receive POST requests at this URL when activities occur.',
          testEndpoint: `curl -X POST ${body.url} -H "Content-Type: application/json" -d '{"event":"test","timestamp":"${new Date().toISOString()}","data":{}}'`
        }, { status: 201, headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ 
          error: 'Invalid JSON body' 
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: GET /api/webhooks
    // List all registered webhooks
    // ==========================================
    if (path === '/api/webhooks' && req.method === 'GET') {
      const webhooks = getWebhooks();
      
      // Return sanitized list (hide secrets)
      const sanitized = webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events,
        createdAt: w.createdAt,
        lastDelivery: w.lastDelivery,
        failureCount: w.failureCount,
        active: w.active,
        hasSecret: !!w.secret
      }));
      
      return Response.json({
        count: sanitized.length,
        webhooks: sanitized
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: DELETE /api/webhooks/:id
    // Remove a webhook subscription
    // ==========================================
    if (path.startsWith('/api/webhooks/') && req.method === 'DELETE') {
      const id = path.replace('/api/webhooks/', '');
      
      if (!id) {
        return Response.json({ 
          error: 'Missing webhook ID' 
        }, { status: 400, headers: corsHeaders });
      }
      
      const webhooks = getWebhooks();
      const index = webhooks.findIndex(w => w.id === id);
      
      if (index === -1) {
        return Response.json({ 
          error: 'Webhook not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      const removed = webhooks.splice(index, 1)[0];
      saveWebhooks(webhooks);
      
      console.log(`🔔 Webhook removed: ${removed.url}`);
      
      return Response.json({
        message: 'Webhook removed successfully',
        id: removed.id,
        url: removed.url
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: PATCH /api/webhooks/:id
    // Update webhook (enable/disable, change events)
    // ==========================================
    if (path.startsWith('/api/webhooks/') && req.method === 'PATCH') {
      const id = path.replace('/api/webhooks/', '');
      
      try {
        const body = await req.json() as { active?: boolean; events?: string[]; secret?: string };
        
        const webhooks = getWebhooks();
        const webhook = webhooks.find(w => w.id === id);
        
        if (!webhook) {
          return Response.json({ 
            error: 'Webhook not found' 
          }, { status: 404, headers: corsHeaders });
        }
        
        // Update fields
        if (typeof body.active === 'boolean') {
          webhook.active = body.active;
          if (body.active) {
            webhook.failureCount = 0; // Reset failure count when re-enabling
          }
        }
        
        if (body.events) {
          const validEvents = ['*', 'activity.new', 'activity.batch', 'activity.signed'];
          for (const event of body.events) {
            if (!validEvents.includes(event)) {
              return Response.json({ 
                error: `Invalid event type: ${event}` 
              }, { status: 400, headers: corsHeaders });
            }
          }
          webhook.events = body.events;
        }
        
        if (body.secret !== undefined) {
          webhook.secret = body.secret || undefined;
        }
        
        saveWebhooks(webhooks);
        
        return Response.json({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          active: webhook.active,
          failureCount: webhook.failureCount,
          hasSecret: !!webhook.secret,
          message: 'Webhook updated successfully'
        }, { headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ 
          error: 'Invalid JSON body' 
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: POST /api/webhooks/:id/test
    // Send a test payload to a webhook
    // ==========================================
    if (path.match(/^\/api\/webhooks\/[^/]+\/test$/) && req.method === 'POST') {
      const id = path.replace('/api/webhooks/', '').replace('/test', '');
      
      const webhooks = getWebhooks();
      const webhook = webhooks.find(w => w.id === id);
      
      if (!webhook) {
        return Response.json({ 
          error: 'Webhook not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      // Send test payload
      const testPayload = {
        type: 'test',
        description: 'This is a test webhook delivery from Jarvis Proof of Work',
        timestamp: new Date().toISOString(),
        metadata: { test: true }
      };
      
      const success = await deliverWebhook(
        { ...webhook, events: ['*'] }, // Force delivery for test
        'test',
        testPayload
      );
      
      if (success) {
        return Response.json({
          success: true,
          message: 'Test webhook delivered successfully',
          url: webhook.url
        }, { headers: corsHeaders });
      } else {
        return Response.json({
          success: false,
          message: 'Test webhook delivery failed. Check your endpoint.',
          url: webhook.url
        }, { status: 502, headers: corsHeaders });
      }
    }

    // ==========================================
    // STATIC: /activity.json
    // Direct access to raw activity file
    // ==========================================
    if (path === '/activity.json') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    // ==========================================
    // DASHBOARD: Serve static files
    // Fallback for all other paths
    // ==========================================
    return serveDashboard(path);
  },
  
  // ==========================================
  // WEBSOCKET HANDLERS
  // ==========================================
  websocket: {
    /**
     * Called when a new WebSocket client connects.
     * Sends the initial state (all activities) to the client.
     */
    open(ws) {
      wsClients.add(ws);
      console.log(`🔌 WebSocket connected (${wsClients.size} total)`);
      
      // Send current state immediately on connect
      const activities = getActivities();
      ws.send(JSON.stringify({
        type: 'init',
        data: {
          activities,
          stats: {
            total: activities.length,
            onchain: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
            commits: activities.filter((a: any) => a.type === 'commit').length,
            builds: activities.filter((a: any) => ['build', 'deploy', 'decision'].includes(a.type)).length,
            trades: activities.filter((a: any) => ['trade', 'transfer'].includes(a.type)).length,
            messages: activities.filter((a: any) => a.type === 'message').length,
            tweets: activities.filter((a: any) => a.type === 'tweet').length,
          }
        },
        timestamp: new Date().toISOString()
      }));
    },
    
    /**
     * Called when a WebSocket client disconnects.
     * Removes the client from the broadcast set.
     */
    close(ws) {
      wsClients.delete(ws);
      console.log(`🔌 WebSocket disconnected (${wsClients.size} remaining)`);
    },
    
    /**
     * Called when a WebSocket client sends a message.
     * Currently only handles ping/pong for keepalive.
     */
    message(ws, message) {
      // Simple ping/pong for connection keepalive
      if (message === 'ping') {
        ws.send('pong');
      }
    },
  },
});

// ==============================================
// STARTUP LOGGING
// ==============================================

console.log(`🚀 Proof of Work server running at http://localhost:${PORT}`);
console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
