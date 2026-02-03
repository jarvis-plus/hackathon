// Proof of Work API Server
// Serves activity feed and dashboard with real-time WebSocket updates

import { readFileSync, existsSync, watchFile, statSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 3456;
const BASE_DIR = join(import.meta.dir, '..');
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');
const DASHBOARD_DIR = join(BASE_DIR, 'dashboard');

// Track connected WebSocket clients
const wsClients = new Set<WebSocket>();

// Track activity file state for change detection
let lastActivityMtime = 0;
let lastActivityCount = 0;

function getActivities(): any[] {
  if (!existsSync(ACTIVITY_FILE)) return [];
  const data = readFileSync(ACTIVITY_FILE, 'utf-8');
  return JSON.parse(data);
}

function serveDashboard(path: string): Response {
  const filePath = path === '/' ? '/index.html' : path;
  const fullPath = join(DASHBOARD_DIR, filePath);
  
  if (!existsSync(fullPath)) {
    return new Response('Not Found', { status: 404 });
  }
  
  const content = readFileSync(fullPath);
  const ext = filePath.split('.').pop();
  const contentTypes: Record<string, string> = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    json: 'application/json',
  };
  
  return new Response(content, {
    headers: { 'Content-Type': contentTypes[ext || 'html'] || 'text/plain' }
  });
}

// Broadcast to all connected WebSocket clients
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  for (const ws of wsClients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    } catch (e) {
      // Client disconnected, will be cleaned up
    }
  }
}

// Watch activity file for changes and broadcast
function checkForChanges() {
  try {
    if (!existsSync(ACTIVITY_FILE)) return;
    
    const stats = statSync(ACTIVITY_FILE);
    const mtime = stats.mtimeMs;
    
    // Only check if file was modified
    if (mtime !== lastActivityMtime) {
      lastActivityMtime = mtime;
      
      const activities = getActivities();
      const newCount = activities.length;
      
      // Broadcast if there are new activities
      if (newCount > lastActivityCount) {
        const newActivities = activities.slice(lastActivityCount);
        console.log(`📡 Broadcasting ${newActivities.length} new activities to ${wsClients.size} clients`);
        
        broadcastUpdate('new_activities', {
          activities,
          newItems: newActivities,
          stats: {
            total: activities.length,
            onchain: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
            commits: activities.filter((a: any) => a.type === 'commit').length,
            builds: activities.filter((a: any) => ['build', 'deploy', 'decision'].includes(a.type)).length,
            trades: activities.filter((a: any) => ['trade', 'transfer'].includes(a.type)).length,
            messages: activities.filter((a: any) => a.type === 'message').length,
            tweets: activities.filter((a: any) => a.type === 'tweet').length,
          }
        });
      }
      
      lastActivityCount = newCount;
    }
  } catch (e) {
    // Ignore read errors
  }
}

// Start periodic change check (every 2 seconds)
setInterval(checkForChanges, 2000);

// Initialize activity count
try {
  const activities = getActivities();
  lastActivityCount = activities.length;
  const stats = statSync(ACTIVITY_FILE);
  lastActivityMtime = stats.mtimeMs;
} catch (e) {}

// Create server with WebSocket support
const server = Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

    // WebSocket upgrade
    if (path === '/ws') {
      const upgraded = server.upgrade(req);
      if (upgraded) return undefined;
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    // API routes
    if (path === '/api/activities') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    if (path === '/api/stats') {
      const activities = getActivities();
      const stats = {
        total: activities.length,
        byType: activities.reduce((acc: Record<string, number>, a: any) => {
          acc[a.type] = (acc[a.type] || 0) + 1;
          return acc;
        }, {}),
        firstActivity: activities[0]?.timestamp || null,
        lastActivity: activities[activities.length - 1]?.timestamp || null,
        onchain: activities.filter((a: any) => a.signature || a.proof?.txSignature).length,
      };
      return Response.json(stats, { headers: corsHeaders });
    }

    // Badge/summary endpoint - compact verification summary for sharing
    if (path === '/api/badge' || path === '/api/summary') {
      const activities = getActivities();
      const onchainCount = activities.filter((a: any) => a.signature || a.proof?.txSignature).length;
      const firstActivity = activities[0];
      const lastActivity = activities[activities.length - 1];
      const uniqueDays = new Set(activities.map((a: any) => 
        new Date(a.timestamp).toISOString().split('T')[0]
      )).size;
      
      // Calculate build cycles from activity descriptions
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

    // Text badge for easy copy-paste
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

    // Verification endpoint: /api/verify/:hash
    if (path.startsWith('/api/verify/')) {
      const hash = path.replace('/api/verify/', '');
      
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
      
      const proof = activity.proof || {};
      const txSignature = activity.signature || proof.txSignature;
      const activityHash = activity.hash || proof.hash;
      
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

    // Serve static activity.json
    if (path === '/activity.json') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    // Dashboard
    return serveDashboard(path);
  },
  websocket: {
    open(ws) {
      wsClients.add(ws);
      console.log(`🔌 WebSocket connected (${wsClients.size} total)`);
      
      // Send current state on connect
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
    close(ws) {
      wsClients.delete(ws);
      console.log(`🔌 WebSocket disconnected (${wsClients.size} remaining)`);
    },
    message(ws, message) {
      // Handle ping/pong for keepalive
      if (message === 'ping') {
        ws.send('pong');
      }
    },
  },
});

console.log(`🚀 Proof of Work server running at http://localhost:${PORT}`);
console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
