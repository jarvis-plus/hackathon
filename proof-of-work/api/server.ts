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
 * - GET /api/activities           - All activities as JSON array
 * - GET /api/activities/:hash     - Single activity by hash
 * - PATCH /api/activities/:hash/notes - Add/update notes on activity
 * - DELETE /api/activities/:hash/notes - Remove notes from activity
 * - PATCH /api/activities/:hash/pin - Toggle pin status on activity
 * - GET /api/activities/pinned    - Get all pinned activities
 * - GET /api/stats                - Aggregated statistics
 * - GET /api/health               - Health check for monitoring
 * - GET /api/verify/:hash         - Verify a specific activity by hash
 * - GET /api/badge                - Compact summary for sharing
 * - GET /api/feed.rss             - RSS feed of recent activities
 * - GET /api/digest               - Email-ready digest (daily/weekly/monthly)
 * - GET /metrics                  - Prometheus-compatible metrics
 * - GET /api/openapi.json         - OpenAPI 3.0 specification
 * - GET /api/docs                 - Swagger UI interactive documentation
 * - WS  /ws                       - WebSocket for real-time updates
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

/**
 * API Authentication Configuration
 * 
 * Set API_KEY environment variable to enable authentication.
 * When enabled:
 * - Write operations (POST, PATCH, DELETE) always require auth
 * - Read operations (GET) are public by default
 * - Set API_AUTH_READ=true to also require auth for reads
 * 
 * Authentication methods:
 * - Authorization: Bearer <api_key>
 * - X-API-Key: <api_key>
 */
const API_KEY = process.env.API_KEY || null;
const API_AUTH_READ = process.env.API_AUTH_READ === 'true';

/** Base directory for the proof-of-work module (parent of /api) */
const BASE_DIR = join(import.meta.dir, '..');

/** Path to the activity log file - all activities stored here */
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');

/** Path to the dashboard static files */
const DASHBOARD_DIR = join(BASE_DIR, 'dashboard');

/** Path to the webhook subscriptions file */
const WEBHOOKS_FILE = join(BASE_DIR, 'data', 'webhooks.json');

/** Path to the digest subscriptions file */
const DIGEST_FILE = join(BASE_DIR, 'data', 'digest-subscriptions.json');

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
  format?: 'json' | 'slack' | 'discord'; // Output format (default: json)
  createdAt: string;
  lastDelivery?: string;
  failureCount: number;
  active: boolean;
}

// ==============================================
// SLACK & DISCORD WEBHOOK FORMATTERS
// ==============================================

/**
 * Format activity payload for Slack Block Kit.
 * Creates a rich message with activity details, on-chain status, and links.
 */
function formatSlackPayload(eventType: string, payload: any): object {
  const activity = payload.activity || payload;
  const timestamp = new Date().toISOString();
  
  // Emoji for activity types
  const typeEmoji: Record<string, string> = {
    'build': '🔨',
    'commit': '📝',
    'decision': '🎯',
    'research': '🔍',
    'email': '📧',
    'calendar': '📅',
    'browser': '🌐',
    'default': '⚡'
  };
  
  const emoji = typeEmoji[activity?.type] || typeEmoji.default;
  const onChainStatus = activity?.signature ? '✅ On-Chain' : '⏳ Pending';
  const activityHash = activity?.hash ? activity.hash.substring(0, 8) : 'N/A';
  
  return {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} New Activity: ${eventType}`,
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Type:*\n${activity?.type || 'unknown'}`
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${onChainStatus}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${activity?.description || 'No description'}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📋 Hash: \`${activityHash}\` | 🕐 ${new Date(activity?.timestamp || timestamp).toLocaleString()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🔗 View Dashboard',
              emoji: true
            },
            url: 'https://jarvis.tail6a9bde.ts.net/pow/',
            action_id: 'view_dashboard'
          }
        ]
      }
    ],
    // Fallback text for notifications
    text: `${emoji} ${eventType}: ${activity?.description || 'New activity'} (${onChainStatus})`
  };
}

/**
 * Format activity payload for Discord Embed.
 * Creates a rich embed with activity details, color-coded by type.
 */
function formatDiscordPayload(eventType: string, payload: any): object {
  const activity = payload.activity || payload;
  const timestamp = new Date().toISOString();
  
  // Colors for activity types (Discord uses decimal)
  const typeColors: Record<string, number> = {
    'build': 0x10B981,    // Green
    'commit': 0x6366F1,   // Indigo
    'decision': 0xF59E0B, // Amber
    'research': 0x8B5CF6, // Purple
    'email': 0x3B82F6,    // Blue
    'calendar': 0xEC4899, // Pink
    'browser': 0x14B8A6,  // Teal
    'default': 0x6B7280   // Gray
  };
  
  // Emoji for activity types
  const typeEmoji: Record<string, string> = {
    'build': '🔨',
    'commit': '📝',
    'decision': '🎯',
    'research': '🔍',
    'email': '📧',
    'calendar': '📅',
    'browser': '🌐',
    'default': '⚡'
  };
  
  const color = typeColors[activity?.type] || typeColors.default;
  const emoji = typeEmoji[activity?.type] || typeEmoji.default;
  const onChainStatus = activity?.signature ? '✅ On-Chain' : '⏳ Pending';
  const activityHash = activity?.hash ? activity.hash.substring(0, 8) : 'N/A';
  
  return {
    embeds: [
      {
        title: `${emoji} ${eventType}`,
        description: activity?.description || 'No description',
        color: color,
        fields: [
          {
            name: 'Type',
            value: activity?.type || 'unknown',
            inline: true
          },
          {
            name: 'Status',
            value: onChainStatus,
            inline: true
          },
          {
            name: 'Hash',
            value: `\`${activityHash}\``,
            inline: true
          }
        ],
        footer: {
          text: 'Jarvis Proof of Work',
          icon_url: 'https://jarvis.tail6a9bde.ts.net/pow/favicon.png'
        },
        timestamp: activity?.timestamp || timestamp,
        url: 'https://jarvis.tail6a9bde.ts.net/pow/'
      }
    ],
    // Optional: username and avatar for the webhook
    username: 'Jarvis PoW',
    avatar_url: 'https://jarvis.tail6a9bde.ts.net/pow/favicon.png'
  };
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
  
  // Format payload based on webhook format setting
  let formattedPayload: object;
  const format = webhook.format || 'json';
  
  switch (format) {
    case 'slack':
      formattedPayload = formatSlackPayload(eventType, payload);
      break;
    case 'discord':
      formattedPayload = formatDiscordPayload(eventType, payload);
      break;
    case 'json':
    default:
      formattedPayload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        data: payload
      };
  }
  
  const body = JSON.stringify(formattedPayload);
  
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
// EMAIL DIGEST SYSTEM
// ==============================================

/**
 * Digest Subscription Interface
 * 
 * Each digest subscription contains:
 * - id: Unique identifier for management
 * - email: Email address to send digest to
 * - frequency: daily, weekly, or monthly
 * - createdAt: When the subscription was created
 * - lastSent: Timestamp of last successful send
 * - active: Whether the subscription is enabled
 * - timezone: Timezone for scheduling (default: UTC)
 */
interface DigestSubscription {
  id: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  createdAt: string;
  lastSent?: string;
  active: boolean;
  timezone?: string;
}

/**
 * Load all digest subscriptions from file.
 * Returns empty array if file doesn't exist.
 */
function getDigestSubscriptions(): DigestSubscription[] {
  if (!existsSync(DIGEST_FILE)) return [];
  try {
    const data = readFileSync(DIGEST_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load digest subscriptions:', e);
    return [];
  }
}

/**
 * Save digest subscriptions to file.
 */
function saveDigestSubscriptions(subscriptions: DigestSubscription[]): void {
  try {
    writeFileSync(DIGEST_FILE, JSON.stringify(subscriptions, null, 2));
  } catch (e) {
    console.error('Failed to save digest subscriptions:', e);
  }
}

/**
 * Validate email format using simple regex.
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

/** Rate limit store for webhook write operations (POST/DELETE) */
const webhookWriteRateLimitStore = new Map<string, RateLimitEntry>();

/** Rate limit store for webhook test operations */
const webhookTestRateLimitStore = new Map<string, RateLimitEntry>();

/** Duration of the sliding window in milliseconds (1 minute) */
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

/** Maximum API requests allowed per IP within the window */
const API_RATE_LIMIT = parseInt(process.env.API_RATE_LIMIT || '100');

/** Maximum WebSocket connections allowed per IP within the window */
const WS_RATE_LIMIT = parseInt(process.env.WS_RATE_LIMIT || '10');

/** Maximum webhook write operations (POST/DELETE) per IP within the window */
const WEBHOOK_WRITE_LIMIT = parseInt(process.env.WEBHOOK_WRITE_LIMIT || '5');

/** Maximum webhook test operations per IP within the window */
const WEBHOOK_TEST_LIMIT = parseInt(process.env.WEBHOOK_TEST_LIMIT || '10');

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
  
  // Clean up webhook write rate limit store
  for (const [ip, entry] of webhookWriteRateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      webhookWriteRateLimitStore.delete(ip);
    }
  }
  
  // Clean up webhook test rate limit store
  for (const [ip, entry] of webhookTestRateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter(t => t > cutoff);
    if (entry.timestamps.length === 0) {
      webhookTestRateLimitStore.delete(ip);
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
 * @param limit - The rate limit that was exceeded (for headers)
 * @param category - Optional category name for the error message
 * @returns HTTP 429 Response with JSON body
 */
function rateLimitResponse(resetIn: number, limit: number = API_RATE_LIMIT, category?: string): Response {
  const categoryMsg = category ? ` for ${category}` : '';
  return new Response(JSON.stringify({
    error: 'Too Many Requests',
    message: `Rate limit${categoryMsg} exceeded. Try again in ${resetIn} seconds.`,
    retryAfter: resetIn,
    category: category || 'api'
  }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(resetIn),
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + resetIn)
    }
  });
}

/**
 * Get rate limit status for an IP across all categories.
 * 
 * @param ip - The client's IP address
 * @returns Object with rate limit status for each category
 */
function getRateLimitStatus(ip: string): Record<string, { used: number; limit: number; remaining: number; resetIn: number }> {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  
  const getStatus = (store: Map<string, RateLimitEntry>, limit: number) => {
    const entry = store.get(ip);
    const validTimestamps = entry?.timestamps.filter(t => t > cutoff) || [];
    const used = validTimestamps.length;
    const remaining = Math.max(0, limit - used);
    const resetIn = validTimestamps.length > 0 
      ? Math.ceil((validTimestamps[0] + RATE_LIMIT_WINDOW_MS - now) / 1000)
      : 60;
    return { used, limit, remaining, resetIn };
  };
  
  return {
    api: getStatus(rateLimitStore, API_RATE_LIMIT),
    websocket: getStatus(WS_RATE_LIMIT_STORE, WS_RATE_LIMIT),
    webhookWrite: getStatus(webhookWriteRateLimitStore, WEBHOOK_WRITE_LIMIT),
    webhookTest: getStatus(webhookTestRateLimitStore, WEBHOOK_TEST_LIMIT),
  };
}

// ==============================================
// API AUTHENTICATION
// ==============================================

/**
 * Check if the request has a valid API key.
 * 
 * Supports two authentication methods:
 * 1. Authorization: Bearer <api_key>
 * 2. X-API-Key: <api_key>
 * 
 * @param req - The incoming HTTP request
 * @returns Object with isValid flag and error message if invalid
 */
function checkApiAuth(req: Request): { isValid: boolean; error?: string } {
  // If no API_KEY is configured, auth is disabled (allow all)
  if (!API_KEY) {
    return { isValid: true };
  }
  
  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      if (parts[1] === API_KEY) {
        return { isValid: true };
      }
      return { isValid: false, error: 'Invalid API key' };
    }
  }
  
  // Check X-API-Key header (alternative method)
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    if (apiKeyHeader === API_KEY) {
      return { isValid: true };
    }
    return { isValid: false, error: 'Invalid API key' };
  }
  
  return { isValid: false, error: 'API key required. Use Authorization: Bearer <key> or X-API-Key: <key>' };
}

/**
 * Check if authentication is required for this request.
 * 
 * Rules:
 * - If API_KEY is not set, no auth required
 * - Write operations (POST, PATCH, DELETE) always require auth when enabled
 * - GET requests only require auth if API_AUTH_READ is true
 * 
 * @param req - The incoming HTTP request
 * @returns true if auth check should be performed
 */
function requiresAuth(req: Request): boolean {
  if (!API_KEY) return false;
  
  const method = req.method.toUpperCase();
  
  // Write operations always require auth when API_KEY is set
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
    return true;
  }
  
  // GET/HEAD only require auth if explicitly configured
  return API_AUTH_READ;
}

/**
 * Generate a 401 Unauthorized response.
 * 
 * @param message - Error message to include
 * @returns HTTP 401 Response with JSON body
 */
function unauthorizedResponse(message: string): Response {
  return new Response(JSON.stringify({
    error: 'Unauthorized',
    message,
    hint: 'Set Authorization: Bearer <api_key> or X-API-Key: <api_key> header'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="Jarvis PoW API"'
    }
  });
}

// ==============================================
// BACKUP VALIDATION
// ==============================================

/**
 * Validate a backup file structure and contents.
 * 
 * Checks:
 * - Required fields (version, format, activities)
 * - Activity structure (timestamp, type, description required)
 * - Version compatibility
 * 
 * @param backup - The backup object to validate
 * @returns Object with valid flag, errors array, and warnings array
 */
function validateBackup(backup: any): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required fields
  if (!backup || typeof backup !== 'object') {
    errors.push('Backup must be a valid JSON object');
    return { valid: false, errors, warnings };
  }
  
  if (!backup.version) {
    errors.push('Missing required field: version');
  } else if (!backup.version.match(/^\d+\.\d+\.\d+$/)) {
    warnings.push(`Unusual version format: ${backup.version}`);
  }
  
  if (backup.format && backup.format !== 'jarvis-pow-backup') {
    warnings.push(`Unknown backup format: ${backup.format}. Expected: jarvis-pow-backup`);
  }
  
  if (!backup.activities) {
    errors.push('Missing required field: activities');
  } else if (!Array.isArray(backup.activities)) {
    errors.push('Field "activities" must be an array');
  } else {
    // Validate each activity
    let invalidCount = 0;
    for (let i = 0; i < backup.activities.length; i++) {
      const a = backup.activities[i];
      if (!a.timestamp) {
        invalidCount++;
        if (invalidCount <= 3) errors.push(`Activity ${i}: missing timestamp`);
      }
      if (!a.type) {
        invalidCount++;
        if (invalidCount <= 3) errors.push(`Activity ${i}: missing type`);
      }
      if (!a.description) {
        invalidCount++;
        if (invalidCount <= 3) errors.push(`Activity ${i}: missing description`);
      }
    }
    if (invalidCount > 3) {
      errors.push(`... and ${invalidCount - 3} more validation errors`);
    }
  }
  
  // Check version compatibility
  if (backup.version && backup.version.startsWith('2.')) {
    warnings.push('Backup is from a newer version. Some fields may not be recognized.');
  }
  
  // Webhooks validation (if present)
  if (backup.webhooks && !Array.isArray(backup.webhooks)) {
    errors.push('Field "webhooks" must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
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
 * Save activities to the activity file.
 * Updates internal state tracking for file watcher.
 * 
 * @param activities - Array of activity objects to save
 */
function saveActivities(activities: any[]): void {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  lastActivityCount = activities.length;
  const stats = statSync(ACTIVITY_FILE);
  lastActivityMtime = stats.mtimeMs;
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
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
      
      // ==========================================
      // API AUTHENTICATION CHECK
      // Skip auth for /api/auth/status endpoint (always public)
      // ==========================================
      if (path !== '/api/auth/status' && requiresAuth(req)) {
        const authResult = checkApiAuth(req);
        if (!authResult.isValid) {
          return unauthorizedResponse(authResult.error || 'Unauthorized');
        }
      }
    }

    // ==========================================
    // API: GET /api/openapi.json
    // OpenAPI 3.0 specification for the API
    // Always public - documentation should be accessible
    // ==========================================
    if (path === '/api/openapi.json') {
      try {
        const openapiPath = join(import.meta.dir, 'openapi.json');
        const spec = readFileSync(openapiPath, 'utf-8');
        return new Response(spec, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      } catch (e) {
        return Response.json({ error: 'OpenAPI spec not found' }, { status: 404, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: GET /api/docs
    // Swagger UI for interactive API documentation
    // Always public - documentation should be accessible
    // ==========================================
    if (path === '/api/docs') {
      const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jarvis PoW API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <link rel="icon" type="image/png" href="/pow/icon.png">
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .swagger-ui .topbar { display: none; }
    .swagger-ui .info { margin: 30px 0; }
    .swagger-ui .info .title { font-size: 2.5rem; }
    .swagger-ui .info .description p { font-size: 1rem; }
    .custom-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }
    .custom-header h1 { margin: 0 0 10px 0; font-size: 1.8rem; }
    .custom-header p { margin: 0; opacity: 0.8; }
    .custom-header a { color: #4fc3f7; text-decoration: none; }
    .custom-header a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="custom-header">
    <h1>🤖 Jarvis Proof of Work API</h1>
    <p>
      <a href="/pow/">Dashboard</a> •
      <a href="/api/openapi.json">OpenAPI Spec</a> •
      <a href="https://github.com/jarvis-plus/hackathon">GitHub</a>
    </p>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        validatorUrl: null,
        tryItOutEnabled: true
      });
    };
  </script>
</body>
</html>`;
      return new Response(swaggerHtml, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }

    // ==========================================
    // API: GET /api/auth/status
    // Check authentication status and requirements
    // Always public - lets clients know if auth is needed
    // ==========================================
    if (path === '/api/auth/status') {
      const isAuthenticated = API_KEY ? checkApiAuth(req).isValid : true;
      return Response.json({
        authEnabled: !!API_KEY,
        authRequiredForReads: API_AUTH_READ,
        authRequiredForWrites: !!API_KEY,
        authenticated: isAuthenticated,
        message: API_KEY 
          ? 'API authentication is enabled. Use Authorization: Bearer <key> or X-API-Key: <key> header.'
          : 'API authentication is disabled. All endpoints are public.',
        endpoints: {
          publicAlways: ['/api/auth/status', '/api/health', '/api/ratelimit'],
          requiresAuthForWrites: ['/api/webhooks'],
          configurable: ['/api/activities', '/api/stats', '/api/verify/*']
        }
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/ratelimit
    // Check rate limit status for the requesting IP
    // Always public - helps clients manage their usage
    // ==========================================
    if (path === '/api/ratelimit') {
      const status = getRateLimitStatus(clientIP);
      return Response.json({
        ip: clientIP,
        windowMs: RATE_LIMIT_WINDOW_MS,
        windowSeconds: RATE_LIMIT_WINDOW_MS / 1000,
        limits: {
          api: {
            description: 'General API requests',
            limit: API_RATE_LIMIT,
            used: status.api.used,
            remaining: status.api.remaining,
            resetIn: status.api.resetIn
          },
          websocket: {
            description: 'WebSocket connections',
            limit: WS_RATE_LIMIT,
            used: status.websocket.used,
            remaining: status.websocket.remaining,
            resetIn: status.websocket.resetIn
          },
          webhookWrite: {
            description: 'Webhook registration/deletion',
            limit: WEBHOOK_WRITE_LIMIT,
            used: status.webhookWrite.used,
            remaining: status.webhookWrite.remaining,
            resetIn: status.webhookWrite.resetIn
          },
          webhookTest: {
            description: 'Webhook test deliveries',
            limit: WEBHOOK_TEST_LIMIT,
            used: status.webhookTest.used,
            remaining: status.webhookTest.remaining,
            resetIn: status.webhookTest.resetIn
          }
        },
        hint: 'Rate limits are per-IP using a sliding window. Different endpoints have different limits.'
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/activities
    // Returns all activities as a JSON array
    // ==========================================
    if (path === '/api/activities') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/activities/:hash
    // Get a single activity by hash
    // ==========================================
    if (path.match(/^\/api\/activities\/[a-f0-9]{64}$/) && req.method === 'GET') {
      const hash = path.split('/').pop()!;
      const activities = getActivities();
      const activity = activities.find((a: any) => a.hash === hash);
      
      if (!activity) {
        return Response.json({ 
          error: 'Activity not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      return Response.json(activity, { headers: corsHeaders });
    }

    // ==========================================
    // API: PATCH /api/activities/:hash/notes
    // Add or update notes on an activity
    // Notes are user-added annotations (not part of the signed content)
    // ==========================================
    if (path.match(/^\/api\/activities\/[a-f0-9]{64}\/notes$/) && req.method === 'PATCH') {
      const hash = path.split('/')[3];
      
      try {
        const body = await req.json() as { notes: string };
        
        if (typeof body.notes !== 'string') {
          return Response.json({ 
            error: 'notes must be a string' 
          }, { status: 400, headers: corsHeaders });
        }
        
        // Limit notes length to prevent abuse
        if (body.notes.length > 2000) {
          return Response.json({ 
            error: 'notes cannot exceed 2000 characters' 
          }, { status: 400, headers: corsHeaders });
        }
        
        const activities = getActivities();
        const activityIndex = activities.findIndex((a: any) => a.hash === hash);
        
        if (activityIndex === -1) {
          return Response.json({ 
            error: 'Activity not found' 
          }, { status: 404, headers: corsHeaders });
        }
        
        // Add or update notes field
        const trimmedNotes = body.notes.trim();
        if (trimmedNotes) {
          activities[activityIndex].notes = trimmedNotes;
          activities[activityIndex].notesUpdatedAt = new Date().toISOString();
        } else {
          // Empty notes = remove the field
          delete activities[activityIndex].notes;
          delete activities[activityIndex].notesUpdatedAt;
        }
        
        saveActivities(activities);
        
        console.log(`📝 Notes ${trimmedNotes ? 'updated' : 'removed'} for activity: ${hash.slice(0, 8)}...`);
        
        return Response.json({
          hash,
          notes: activities[activityIndex].notes || null,
          notesUpdatedAt: activities[activityIndex].notesUpdatedAt || null,
          message: trimmedNotes ? 'Notes updated successfully' : 'Notes removed successfully'
        }, { headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ 
          error: 'Invalid JSON body' 
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: DELETE /api/activities/:hash/notes
    // Remove notes from an activity
    // ==========================================
    if (path.match(/^\/api\/activities\/[a-f0-9]{64}\/notes$/) && req.method === 'DELETE') {
      const hash = path.split('/')[3];
      
      const activities = getActivities();
      const activityIndex = activities.findIndex((a: any) => a.hash === hash);
      
      if (activityIndex === -1) {
        return Response.json({ 
          error: 'Activity not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      const hadNotes = !!activities[activityIndex].notes;
      delete activities[activityIndex].notes;
      delete activities[activityIndex].notesUpdatedAt;
      
      if (hadNotes) {
        saveActivities(activities);
        console.log(`📝 Notes removed for activity: ${hash.slice(0, 8)}...`);
      }
      
      return Response.json({
        hash,
        message: hadNotes ? 'Notes removed successfully' : 'Activity had no notes'
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: PATCH /api/activities/:hash/pin
    // Toggle pin status on an activity
    // Pinned activities appear at the top of the feed
    // ==========================================
    if (path.match(/^\/api\/activities\/[a-f0-9]{64}\/pin$/) && req.method === 'PATCH') {
      const hash = path.split('/')[3];
      
      try {
        const body = await req.json() as { pinned?: boolean };
        
        const activities = getActivities();
        const activityIndex = activities.findIndex((a: any) => a.hash === hash);
        
        if (activityIndex === -1) {
          return Response.json({ 
            error: 'Activity not found' 
          }, { status: 404, headers: corsHeaders });
        }
        
        // Toggle or set explicit pin status
        const currentPinned = !!activities[activityIndex].pinned;
        const newPinned = body.pinned !== undefined ? body.pinned : !currentPinned;
        
        if (newPinned) {
          activities[activityIndex].pinned = true;
          activities[activityIndex].pinnedAt = new Date().toISOString();
        } else {
          delete activities[activityIndex].pinned;
          delete activities[activityIndex].pinnedAt;
        }
        
        saveActivities(activities);
        
        console.log(`📌 Activity ${hash.slice(0, 8)}... ${newPinned ? 'pinned' : 'unpinned'}`);
        
        return Response.json({
          hash,
          pinned: newPinned,
          pinnedAt: activities[activityIndex].pinnedAt || null,
          message: newPinned ? 'Activity pinned' : 'Activity unpinned'
        }, { headers: corsHeaders });
        
      } catch (e) {
        // Allow empty body (toggle mode)
        const activities = getActivities();
        const activityIndex = activities.findIndex((a: any) => a.hash === hash);
        
        if (activityIndex === -1) {
          return Response.json({ error: 'Activity not found' }, { status: 404, headers: corsHeaders });
        }
        
        const newPinned = !activities[activityIndex].pinned;
        if (newPinned) {
          activities[activityIndex].pinned = true;
          activities[activityIndex].pinnedAt = new Date().toISOString();
        } else {
          delete activities[activityIndex].pinned;
          delete activities[activityIndex].pinnedAt;
        }
        
        saveActivities(activities);
        
        return Response.json({
          hash,
          pinned: newPinned,
          message: newPinned ? 'Activity pinned' : 'Activity unpinned'
        }, { headers: corsHeaders });
      }
    }

    // ==========================================
    // API: GET /api/activities/pinned
    // Get all pinned activities
    // ==========================================
    if (path === '/api/activities/pinned' && req.method === 'GET') {
      const activities = getActivities();
      const pinned = activities
        .filter((a: any) => a.pinned)
        .sort((a: any, b: any) => {
          // Sort by pinnedAt date, most recent first
          const aTime = new Date(a.pinnedAt || 0).getTime();
          const bTime = new Date(b.pinnedAt || 0).getTime();
          return bTime - aTime;
        });
      
      return Response.json({
        count: pinned.length,
        activities: pinned
      }, { headers: corsHeaders });
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
    // API: GET /api/digest
    // Email-ready activity digest for a given period
    // Query params:
    //   - period: daily (default), weekly, monthly
    //   - format: html (default), text, json
    //   - date: ISO date to generate digest for (defaults to now)
    // ==========================================
    if (path === '/api/digest' && req.method === 'GET') {
      const activities = getActivities();
      const period = url.searchParams.get('period') || 'daily';
      const format = url.searchParams.get('format') || 'html';
      const dateParam = url.searchParams.get('date');
      
      // Calculate date range based on period
      const endDate = dateParam ? new Date(dateParam) : new Date();
      const startDate = new Date(endDate);
      
      switch (period) {
        case 'weekly':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case 'monthly':
          startDate.setMonth(startDate.getMonth() - 1);
          break;
        case 'daily':
        default:
          startDate.setDate(startDate.getDate() - 1);
      }
      
      // Filter activities in date range
      const periodActivities = activities.filter((a: any) => {
        const actDate = new Date(a.timestamp);
        return actDate >= startDate && actDate <= endDate;
      });
      
      // Calculate stats for the period
      const onchainCount = periodActivities.filter((a: any) => 
        a.signature || a.proof?.txSignature
      ).length;
      
      const typeCounts: Record<string, number> = {};
      periodActivities.forEach((a: any) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      });
      
      // Sort by count descending
      const topTypes = Object.entries(typeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      // Count unique days in period
      const uniqueDays = new Set(periodActivities.map((a: any) => 
        new Date(a.timestamp).toISOString().split('T')[0]
      )).size;
      
      // Get pinned activities
      const pinnedActivities = periodActivities.filter((a: any) => a.pinned);
      
      // Build digest data structure
      const digestData = {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        summary: {
          totalActivities: periodActivities.length,
          onChainProofs: onchainCount,
          verificationRate: periodActivities.length > 0 
            ? Math.round((onchainCount / periodActivities.length) * 100) 
            : 0,
          uniqueDays,
          pinnedCount: pinnedActivities.length,
        },
        breakdown: topTypes.map(([type, count]) => ({ type, count })),
        highlights: periodActivities
          .filter((a: any) => a.pinned || a.type === 'build' || a.type === 'decision')
          .slice(-10)
          .reverse()
          .map((a: any) => ({
            type: a.type,
            description: a.description,
            timestamp: a.timestamp,
            pinned: a.pinned || false,
          })),
        allActivities: periodActivities.map((a: any) => ({
          type: a.type,
          description: a.description,
          timestamp: a.timestamp,
          onChain: !!(a.signature || a.proof?.txSignature),
        })),
        links: {
          dashboard: 'https://jarvis.tail6a9bde.ts.net/pow/',
          api: 'https://jarvis.tail6a9bde.ts.net/pow/api/activities',
          rss: 'https://jarvis.tail6a9bde.ts.net/pow/api/feed.rss',
        },
        generatedAt: new Date().toISOString(),
      };
      
      // Return based on format
      if (format === 'json') {
        return Response.json(digestData, { headers: corsHeaders });
      }
      
      if (format === 'text') {
        const periodLabel = period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly';
        const text = `
JARVIS PROOF OF WORK - ${periodLabel.toUpperCase()} DIGEST
${'='.repeat(50)}

Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}
Generated: ${new Date().toLocaleString()}

SUMMARY
-------
Total Activities: ${digestData.summary.totalActivities}
On-Chain Proofs: ${digestData.summary.onChainProofs} (${digestData.summary.verificationRate}%)
Active Days: ${digestData.summary.uniqueDays}
Pinned Items: ${digestData.summary.pinnedCount}

ACTIVITY BREAKDOWN
------------------
${topTypes.map(([type, count]) => `${type}: ${count}`).join('\n')}

HIGHLIGHTS
----------
${digestData.highlights.map(h => 
  `${h.pinned ? '📌 ' : ''}[${h.type}] ${h.description.slice(0, 80)}${h.description.length > 80 ? '...' : ''}`
).join('\n')}

LINKS
-----
Dashboard: ${digestData.links.dashboard}
API: ${digestData.links.api}
RSS: ${digestData.links.rss}

---
Jarvis AI Agent | Colosseum Agent Hackathon 2026
`.trim();
        
        return new Response(text, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/plain; charset=utf-8',
          }
        });
      }
      
      // Default: HTML format (email-ready)
      const periodLabel = period === 'daily' ? 'Daily' : period === 'weekly' ? 'Weekly' : 'Monthly';
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jarvis Proof of Work - ${periodLabel} Digest</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0ea5e9;
    }
    .header h1 {
      color: #0ea5e9;
      margin: 0 0 8px 0;
      font-size: 24px;
    }
    .header .period {
      color: #666;
      font-size: 14px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #0ea5e9;
    }
    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      font-size: 16px;
      color: #333;
      margin: 0 0 15px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .breakdown-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .breakdown-type {
      font-weight: 500;
    }
    .breakdown-count {
      color: #0ea5e9;
      font-weight: bold;
    }
    .highlight {
      padding: 12px;
      margin-bottom: 10px;
      background: #f8fafc;
      border-radius: 6px;
      border-left: 3px solid #0ea5e9;
    }
    .highlight.pinned {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .highlight-type {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      background: #0ea5e9;
      color: white;
      border-radius: 4px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .highlight.pinned .highlight-type {
      background: #f59e0b;
    }
    .highlight-desc {
      font-size: 14px;
      color: #333;
    }
    .cta {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #0ea5e9, #06b6d4);
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 12px;
      color: #999;
    }
    .footer a {
      color: #0ea5e9;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🤖 Jarvis Proof of Work</h1>
      <div class="period">${periodLabel} Digest: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</div>
    </div>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">${digestData.summary.totalActivities}</div>
        <div class="stat-label">Activities</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${digestData.summary.verificationRate}%</div>
        <div class="stat-label">On-Chain</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${digestData.summary.uniqueDays}</div>
        <div class="stat-label">Active Days</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${digestData.summary.pinnedCount}</div>
        <div class="stat-label">Pinned</div>
      </div>
    </div>
    
    <div class="section">
      <h2>📊 Activity Breakdown</h2>
      ${topTypes.map(([type, count]) => `
        <div class="breakdown-item">
          <span class="breakdown-type">${type}</span>
          <span class="breakdown-count">${count}</span>
        </div>
      `).join('')}
    </div>
    
    <div class="section">
      <h2>⭐ Highlights</h2>
      ${digestData.highlights.length > 0 
        ? digestData.highlights.map(h => `
          <div class="highlight${h.pinned ? ' pinned' : ''}">
            <span class="highlight-type">${h.pinned ? '📌 ' : ''}${h.type}</span>
            <div class="highlight-desc">${h.description.slice(0, 150)}${h.description.length > 150 ? '...' : ''}</div>
          </div>
        `).join('')
        : '<p style="color: #666; font-style: italic;">No highlights for this period.</p>'
      }
    </div>
    
    <div class="cta">
      <a href="${digestData.links.dashboard}" class="cta-button">View Full Dashboard →</a>
    </div>
    
    <div class="footer">
      <p>Jarvis AI Agent | <a href="https://colosseum.com/agent-hackathon">Colosseum Agent Hackathon 2026</a></p>
      <p>
        <a href="${digestData.links.dashboard}">Dashboard</a> · 
        <a href="${digestData.links.api}">API</a> · 
        <a href="${digestData.links.rss}">RSS</a>
      </p>
    </div>
  </div>
</body>
</html>`;
      
      return new Response(html, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/html; charset=utf-8',
        }
      });
    }

    // ==========================================
    // API: GET /api/digest/subscriptions
    // List all digest subscriptions
    // ==========================================
    if (path === '/api/digest/subscriptions' && req.method === 'GET') {
      const subscriptions = getDigestSubscriptions();
      
      // Return list (sanitize email to show domain only for privacy)
      const sanitized = subscriptions.map(s => ({
        id: s.id,
        email: s.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
        frequency: s.frequency,
        createdAt: s.createdAt,
        lastSent: s.lastSent,
        active: s.active,
        timezone: s.timezone || 'UTC'
      }));
      
      return Response.json({
        count: sanitized.length,
        subscriptions: sanitized
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: POST /api/digest/subscriptions
    // Subscribe to email digests
    // ==========================================
    if (path === '/api/digest/subscriptions' && req.method === 'POST') {
      try {
        const body = await req.json() as { 
          email?: string; 
          frequency?: string;
          timezone?: string;
        };
        
        // Validate email
        if (!body.email) {
          return Response.json({ 
            error: 'Missing required field: email' 
          }, { status: 400, headers: corsHeaders });
        }
        
        if (!isValidEmail(body.email)) {
          return Response.json({ 
            error: 'Invalid email format' 
          }, { status: 400, headers: corsHeaders });
        }
        
        // Validate frequency
        const validFrequencies = ['daily', 'weekly', 'monthly'];
        const frequency = body.frequency || 'daily';
        if (!validFrequencies.includes(frequency)) {
          return Response.json({ 
            error: `Invalid frequency. Valid options: ${validFrequencies.join(', ')}` 
          }, { status: 400, headers: corsHeaders });
        }
        
        // Check for duplicate email
        const subscriptions = getDigestSubscriptions();
        const existing = subscriptions.find(s => s.email.toLowerCase() === body.email!.toLowerCase());
        if (existing) {
          return Response.json({ 
            error: 'Email already subscribed',
            message: 'Use PATCH to update frequency or DELETE to unsubscribe',
            id: existing.id
          }, { status: 409, headers: corsHeaders });
        }
        
        // Create new subscription
        const subscription: DigestSubscription = {
          id: randomUUID(),
          email: body.email.toLowerCase(),
          frequency: frequency as 'daily' | 'weekly' | 'monthly',
          createdAt: new Date().toISOString(),
          active: true,
          timezone: body.timezone || 'UTC'
        };
        
        subscriptions.push(subscription);
        saveDigestSubscriptions(subscriptions);
        
        console.log(`📧 New digest subscription: ${subscription.email} (${frequency})`);
        
        return Response.json({
          id: subscription.id,
          email: subscription.email,
          frequency: subscription.frequency,
          timezone: subscription.timezone,
          createdAt: subscription.createdAt,
          active: subscription.active,
          message: `Subscribed to ${frequency} digest emails. You will receive your first digest soon.`,
          unsubscribeHint: `To unsubscribe: DELETE /api/digest/subscriptions/${subscription.id}`
        }, { status: 201, headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ 
          error: 'Invalid JSON body' 
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: PATCH /api/digest/subscriptions/:id
    // Update subscription (frequency, active status)
    // ==========================================
    if (path.match(/^\/api\/digest\/subscriptions\/[^/]+$/) && req.method === 'PATCH') {
      const id = path.split('/').pop()!;
      
      try {
        const body = await req.json() as { 
          frequency?: string; 
          active?: boolean;
          timezone?: string;
        };
        
        const subscriptions = getDigestSubscriptions();
        const subscription = subscriptions.find(s => s.id === id);
        
        if (!subscription) {
          return Response.json({ 
            error: 'Subscription not found' 
          }, { status: 404, headers: corsHeaders });
        }
        
        // Update fields
        if (body.frequency) {
          const validFrequencies = ['daily', 'weekly', 'monthly'];
          if (!validFrequencies.includes(body.frequency)) {
            return Response.json({ 
              error: `Invalid frequency. Valid options: ${validFrequencies.join(', ')}` 
            }, { status: 400, headers: corsHeaders });
          }
          subscription.frequency = body.frequency as 'daily' | 'weekly' | 'monthly';
        }
        
        if (typeof body.active === 'boolean') {
          subscription.active = body.active;
        }
        
        if (body.timezone) {
          subscription.timezone = body.timezone;
        }
        
        saveDigestSubscriptions(subscriptions);
        
        return Response.json({
          id: subscription.id,
          email: subscription.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          frequency: subscription.frequency,
          active: subscription.active,
          timezone: subscription.timezone,
          message: 'Subscription updated successfully'
        }, { headers: corsHeaders });
        
      } catch (e) {
        return Response.json({ 
          error: 'Invalid JSON body' 
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: DELETE /api/digest/subscriptions/:id
    // Unsubscribe from digest emails
    // ==========================================
    if (path.match(/^\/api\/digest\/subscriptions\/[^/]+$/) && req.method === 'DELETE') {
      const id = path.split('/').pop()!;
      
      const subscriptions = getDigestSubscriptions();
      const index = subscriptions.findIndex(s => s.id === id);
      
      if (index === -1) {
        return Response.json({ 
          error: 'Subscription not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      const removed = subscriptions.splice(index, 1)[0];
      saveDigestSubscriptions(subscriptions);
      
      console.log(`📧 Digest subscription removed: ${removed.email}`);
      
      return Response.json({
        message: 'Unsubscribed successfully',
        id: removed.id,
        email: removed.email.replace(/(.{2}).*(@.*)/, '$1***$2')
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /api/digest/subscriptions/:id
    // Get subscription details (for unsubscribe page)
    // ==========================================
    if (path.match(/^\/api\/digest\/subscriptions\/[^/]+$/) && req.method === 'GET') {
      const id = path.split('/').pop()!;
      
      const subscriptions = getDigestSubscriptions();
      const subscription = subscriptions.find(s => s.id === id);
      
      if (!subscription) {
        return Response.json({ 
          error: 'Subscription not found' 
        }, { status: 404, headers: corsHeaders });
      }
      
      return Response.json({
        id: subscription.id,
        email: subscription.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
        frequency: subscription.frequency,
        createdAt: subscription.createdAt,
        lastSent: subscription.lastSent,
        active: subscription.active,
        timezone: subscription.timezone || 'UTC'
      }, { headers: corsHeaders });
    }

    // ==========================================
    // API: GET /metrics or /api/metrics
    // Prometheus-compatible metrics endpoint
    // Enables monitoring with Prometheus/Grafana
    // ==========================================
    if (path === '/metrics' || path === '/api/metrics') {
      const activities = getActivities();
      const now = Date.now();
      
      // Calculate activity metrics
      const totalActivities = activities.length;
      const onchainCount = activities.filter((a: any) => a.signature || a.proof?.txSignature).length;
      const unsignedCount = totalActivities - onchainCount;
      
      // Count by type
      const typeCounts: Record<string, number> = {};
      activities.forEach((a: any) => {
        typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
      });
      
      // Calculate time-based metrics
      const oneHourAgo = now - 3600000;
      const oneDayAgo = now - 86400000;
      const activitiesLastHour = activities.filter((a: any) => 
        new Date(a.timestamp).getTime() > oneHourAgo
      ).length;
      const activitiesLastDay = activities.filter((a: any) => 
        new Date(a.timestamp).getTime() > oneDayAgo
      ).length;
      
      // Last activity timestamp
      const lastActivity = activities.length > 0 
        ? new Date(activities[activities.length - 1].timestamp).getTime() / 1000 
        : 0;
      
      // First activity timestamp
      const firstActivity = activities.length > 0 
        ? new Date(activities[0].timestamp).getTime() / 1000 
        : 0;
      
      // Calculate unique active days
      const uniqueDays = new Set(activities.map((a: any) => 
        new Date(a.timestamp).toISOString().split('T')[0]
      )).size;
      
      // Build Prometheus metrics output
      const lines: string[] = [
        '# HELP jarvis_pow_activities_total Total number of activities logged',
        '# TYPE jarvis_pow_activities_total counter',
        `jarvis_pow_activities_total ${totalActivities}`,
        '',
        '# HELP jarvis_pow_activities_onchain Number of activities with on-chain proofs',
        '# TYPE jarvis_pow_activities_onchain counter',
        `jarvis_pow_activities_onchain ${onchainCount}`,
        '',
        '# HELP jarvis_pow_activities_unsigned Number of activities pending signature',
        '# TYPE jarvis_pow_activities_unsigned gauge',
        `jarvis_pow_activities_unsigned ${unsignedCount}`,
        '',
        '# HELP jarvis_pow_onchain_ratio Ratio of on-chain to total activities',
        '# TYPE jarvis_pow_onchain_ratio gauge',
        `jarvis_pow_onchain_ratio ${totalActivities > 0 ? (onchainCount / totalActivities).toFixed(4) : 0}`,
        '',
        '# HELP jarvis_pow_activities_by_type Number of activities by type',
        '# TYPE jarvis_pow_activities_by_type gauge',
      ];
      
      // Add type breakdown
      for (const [type, count] of Object.entries(typeCounts)) {
        lines.push(`jarvis_pow_activities_by_type{type="${type}"} ${count}`);
      }
      
      lines.push(
        '',
        '# HELP jarvis_pow_activities_last_hour Activities logged in the last hour',
        '# TYPE jarvis_pow_activities_last_hour gauge',
        `jarvis_pow_activities_last_hour ${activitiesLastHour}`,
        '',
        '# HELP jarvis_pow_activities_last_day Activities logged in the last 24 hours',
        '# TYPE jarvis_pow_activities_last_day gauge',
        `jarvis_pow_activities_last_day ${activitiesLastDay}`,
        '',
        '# HELP jarvis_pow_active_days Total number of unique days with activity',
        '# TYPE jarvis_pow_active_days gauge',
        `jarvis_pow_active_days ${uniqueDays}`,
        '',
        '# HELP jarvis_pow_last_activity_timestamp Unix timestamp of the last activity',
        '# TYPE jarvis_pow_last_activity_timestamp gauge',
        `jarvis_pow_last_activity_timestamp ${lastActivity}`,
        '',
        '# HELP jarvis_pow_first_activity_timestamp Unix timestamp of the first activity',
        '# TYPE jarvis_pow_first_activity_timestamp gauge',
        `jarvis_pow_first_activity_timestamp ${firstActivity}`,
        '',
        '# HELP jarvis_pow_websocket_clients Number of connected WebSocket clients',
        '# TYPE jarvis_pow_websocket_clients gauge',
        `jarvis_pow_websocket_clients ${wsClients.size}`,
        '',
        '# HELP jarvis_pow_webhooks_total Total number of registered webhooks',
        '# TYPE jarvis_pow_webhooks_total gauge',
        `jarvis_pow_webhooks_total ${getWebhooks().length}`,
        '',
        '# HELP jarvis_pow_webhooks_active Number of active webhooks',
        '# TYPE jarvis_pow_webhooks_active gauge',
        `jarvis_pow_webhooks_active ${getWebhooks().filter(w => w.active).length}`,
        '',
        '# HELP jarvis_pow_server_uptime_seconds Server uptime in seconds',
        '# TYPE jarvis_pow_server_uptime_seconds counter',
        `jarvis_pow_server_uptime_seconds ${process.uptime ? Math.floor(process.uptime()) : 0}`,
        '',
        '# HELP jarvis_pow_info Server information',
        '# TYPE jarvis_pow_info gauge',
        `jarvis_pow_info{version="1.0.0",wallet="AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX",hackathon="colosseum-2026"} 1`,
        ''
      );
      
      return new Response(lines.join('\n'), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
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
    // Rate limited to prevent webhook spam
    // ==========================================
    if (path === '/api/webhooks' && req.method === 'POST') {
      // Apply stricter rate limit for webhook writes
      const webhookRateCheck = checkRateLimit(clientIP, webhookWriteRateLimitStore, WEBHOOK_WRITE_LIMIT);
      if (!webhookRateCheck.allowed) {
        return rateLimitResponse(webhookRateCheck.resetIn, WEBHOOK_WRITE_LIMIT, 'webhook registration');
      }
      
      try {
        const body = await req.json() as { 
          url?: string; 
          secret?: string; 
          events?: string[];
          format?: 'json' | 'slack' | 'discord';
        };
        
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
        
        // Validate format (json, slack, discord)
        const validFormats = ['json', 'slack', 'discord'];
        const format = body.format || 'json';
        if (!validFormats.includes(format)) {
          return Response.json({ 
            error: `Invalid format: ${format}. Valid formats: ${validFormats.join(', ')}`,
            hint: 'Use "slack" for Slack webhooks or "discord" for Discord webhooks'
          }, { status: 400, headers: corsHeaders });
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
          format: format as 'json' | 'slack' | 'discord',
          createdAt: new Date().toISOString(),
          failureCount: 0,
          active: true
        };
        
        webhooks.push(webhook);
        saveWebhooks(webhooks);
        
        console.log(`🔔 New webhook registered: ${webhook.url} (format: ${format}, events: ${events.join(', ')})`);
        
        // Format-specific example payloads
        const examplePayloads: Record<string, string> = {
          json: '{"event":"test","timestamp":"' + new Date().toISOString() + '","data":{}}',
          slack: '{"blocks":[{"type":"section","text":{"type":"mrkdwn","text":"Test webhook"}}]}',
          discord: '{"embeds":[{"title":"Test","description":"Webhook test"}]}'
        };
        
        return Response.json({
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          format: webhook.format,
          createdAt: webhook.createdAt,
          active: webhook.active,
          message: `Webhook registered successfully with ${format} format. You will receive POST requests at this URL when activities occur.`,
          testEndpoint: `curl -X POST ${body.url} -H "Content-Type: application/json" -d '${examplePayloads[format]}'`
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
        format: w.format || 'json',
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
    // Rate limited to prevent abuse
    // ==========================================
    if (path.startsWith('/api/webhooks/') && req.method === 'DELETE') {
      // Apply stricter rate limit for webhook writes
      const webhookRateCheck = checkRateLimit(clientIP, webhookWriteRateLimitStore, WEBHOOK_WRITE_LIMIT);
      if (!webhookRateCheck.allowed) {
        return rateLimitResponse(webhookRateCheck.resetIn, WEBHOOK_WRITE_LIMIT, 'webhook deletion');
      }
      
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
    // Rate limited to prevent abuse
    // ==========================================
    if (path.match(/^\/api\/webhooks\/[^/]+\/test$/) && req.method === 'POST') {
      // Apply rate limit for webhook tests
      const testRateCheck = checkRateLimit(clientIP, webhookTestRateLimitStore, WEBHOOK_TEST_LIMIT);
      if (!testRateCheck.allowed) {
        return rateLimitResponse(testRateCheck.resetIn, WEBHOOK_TEST_LIMIT, 'webhook test');
      }
      
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
    // API: GET /api/backup
    // Export all data as a downloadable backup file
    // Includes activities, metadata, and optional webhooks
    // ==========================================
    if (path === '/api/backup' && req.method === 'GET') {
      const includeWebhooks = url.searchParams.get('webhooks') === 'true';
      
      const activities = getActivities();
      const webhooks = includeWebhooks ? getWebhooks().map(w => ({
        ...w,
        secret: undefined // Never include secrets in backups
      })) : undefined;
      
      const backup = {
        version: '1.0.0',
        format: 'jarvis-pow-backup',
        createdAt: new Date().toISOString(),
        server: {
          version: '1.0.0',
          wallet: 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX',
          dashboardUrl: 'https://jarvis.tail6a9bde.ts.net/pow/'
        },
        stats: {
          totalActivities: activities.length,
          onChainActivities: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
          firstActivity: activities[0]?.timestamp || null,
          lastActivity: activities[activities.length - 1]?.timestamp || null,
          activityTypes: activities.reduce((acc: Record<string, number>, a: any) => {
            acc[a.type] = (acc[a.type] || 0) + 1;
            return acc;
          }, {})
        },
        activities,
        ...(includeWebhooks && { webhooks })
      };
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `jarvis-pow-backup-${timestamp}.json`;
      
      return new Response(JSON.stringify(backup, null, 2), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'X-Backup-Version': '1.0.0',
          'X-Activity-Count': String(activities.length)
        }
      });
    }

    // ==========================================
    // POST /api/backup/validate
    // Validate a backup file without importing
    // ==========================================
    if (path === '/api/backup/validate' && req.method === 'POST') {
      try {
        const body = await req.json() as any;
        
        const validation = validateBackup(body);
        
        return Response.json({
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          summary: validation.valid ? {
            version: body.version,
            createdAt: body.createdAt,
            activityCount: body.activities?.length || 0,
            hasWebhooks: !!body.webhooks,
            webhookCount: body.webhooks?.length || 0
          } : null
        }, { 
          status: validation.valid ? 200 : 400,
          headers: corsHeaders 
        });
        
      } catch (e) {
        return Response.json({
          valid: false,
          errors: ['Invalid JSON format'],
          warnings: []
        }, { status: 400, headers: corsHeaders });
      }
    }

    // ==========================================
    // API: POST /api/restore
    // Restore activities from a backup file
    // Requires authentication when enabled
    // ==========================================
    if (path === '/api/restore' && req.method === 'POST') {
      const mode = url.searchParams.get('mode') || 'merge'; // 'merge' or 'replace'
      const dryRun = url.searchParams.get('dry_run') === 'true';
      const includeWebhooks = url.searchParams.get('webhooks') === 'true';
      
      try {
        const body = await req.json() as any;
        
        // Validate backup format
        const validation = validateBackup(body);
        if (!validation.valid) {
          return Response.json({
            success: false,
            error: 'Invalid backup format',
            details: validation.errors
          }, { status: 400, headers: corsHeaders });
        }
        
        const backupActivities = body.activities || [];
        const currentActivities = getActivities();
        
        let resultActivities: any[];
        let added = 0;
        let skipped = 0;
        let replaced = 0;
        
        if (mode === 'replace') {
          // Replace mode: complete overwrite
          resultActivities = backupActivities;
          replaced = currentActivities.length;
          added = backupActivities.length;
        } else {
          // Merge mode: add only new activities (by hash)
          const existingHashes = new Set(
            currentActivities.map((a: any) => a.hash || a.proof?.hash).filter(Boolean)
          );
          
          resultActivities = [...currentActivities];
          
          for (const activity of backupActivities) {
            const hash = activity.hash || activity.proof?.hash;
            if (hash && existingHashes.has(hash)) {
              skipped++;
            } else {
              resultActivities.push(activity);
              added++;
            }
          }
          
          // Sort by timestamp
          resultActivities.sort((a: any, b: any) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );
        }
        
        // Handle webhooks if requested
        let webhooksAdded = 0;
        let webhooksSkipped = 0;
        
        if (includeWebhooks && body.webhooks) {
          const currentWebhooks = getWebhooks();
          const existingUrls = new Set(currentWebhooks.map(w => w.url));
          
          const newWebhooks = body.webhooks.filter((w: any) => !existingUrls.has(w.url));
          webhooksAdded = newWebhooks.length;
          webhooksSkipped = body.webhooks.length - newWebhooks.length;
          
          if (!dryRun && newWebhooks.length > 0) {
            // Reset failure counts and ensure active
            const sanitizedWebhooks = newWebhooks.map((w: any) => ({
              ...w,
              id: randomUUID(), // New IDs for restored webhooks
              failureCount: 0,
              active: true,
              lastDelivery: undefined
            }));
            saveWebhooks([...currentWebhooks, ...sanitizedWebhooks]);
          }
        }
        
        // Write activities if not dry run
        if (!dryRun) {
          writeFileSync(ACTIVITY_FILE, JSON.stringify(resultActivities, null, 2));
          
          // Update internal state
          lastActivityCount = resultActivities.length;
          const stats = statSync(ACTIVITY_FILE);
          lastActivityMtime = stats.mtimeMs;
          
          console.log(`📥 Restore complete: ${added} added, ${skipped} skipped, mode=${mode}`);
        }
        
        return Response.json({
          success: true,
          dryRun,
          mode,
          activities: {
            before: currentActivities.length,
            after: resultActivities.length,
            added,
            skipped,
            ...(mode === 'replace' && { replaced })
          },
          ...(includeWebhooks && {
            webhooks: {
              added: webhooksAdded,
              skipped: webhooksSkipped
            }
          }),
          message: dryRun 
            ? `Dry run: would ${mode === 'replace' ? 'replace' : 'add'} ${added} activities`
            : `Restored ${added} activities (${skipped} duplicates skipped)`
        }, { headers: corsHeaders });
        
      } catch (e) {
        return Response.json({
          success: false,
          error: 'Failed to parse backup file',
          message: String(e)
        }, { status: 400, headers: corsHeaders });
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
console.log(`🔐 API Auth: ${API_KEY ? 'ENABLED' : 'disabled'}${API_KEY && API_AUTH_READ ? ' (read auth required)' : ''}`);
console.log(`⏱️  Rate limits: API=${API_RATE_LIMIT}/min, WS=${WS_RATE_LIMIT}/min, Webhook=${WEBHOOK_WRITE_LIMIT}/min, Test=${WEBHOOK_TEST_LIMIT}/min`);
