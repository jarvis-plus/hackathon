// Proof of Work API Server
// Serves activity feed and dashboard

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PORT = process.env.PORT || 3456;
const BASE_DIR = join(import.meta.dir, '..');
const ACTIVITY_FILE = join(BASE_DIR, 'activity.json');
const DASHBOARD_DIR = join(BASE_DIR, 'dashboard');

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

Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // CORS headers for API
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };

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
      };
      return Response.json(stats, { headers: corsHeaders });
    }

    // Serve static activity.json
    if (path === '/activity.json') {
      return Response.json(getActivities(), { headers: corsHeaders });
    }

    // Dashboard
    return serveDashboard(path);
  },
});

console.log(`🚀 Proof of Work server running at http://localhost:${PORT}`);
