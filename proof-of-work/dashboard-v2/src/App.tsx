import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import "./index.css";

// Types
interface Activity {
  hash: string;
  type: string;
  description: string;
  timestamp: string;
  signature?: string;
  wallet?: string;
}

interface Stats {
  total: number;
  onchain: number;
  byType: Record<string, number>;
  streak: {
    current: number;
    longest: number;
  };
}

// API base - uses same origin in production, localhost for dev
const API_BASE = typeof window !== 'undefined' && window.location.port === '3457' 
  ? '' 
  : 'http://localhost:3457';

// Type emoji mapping
const typeEmoji: Record<string, string> = {
  commit: "📝",
  build: "🔧",
  trade: "💱",
  message: "💬",
  email: "📧",
  tweet: "🐦",
  decision: "🎯",
  heartbeat: "💓",
  browser: "🌐",
  calendar: "📅",
  deploy: "🚀",
};

function StatCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: string; subtitle?: string }) {
  return (
    <Card className="bg-card/50 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <span>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function ActivityCard({ activity }: { activity: Activity }) {
  const emoji = typeEmoji[activity.type] || "⚡";
  const time = new Date(activity.timestamp).toLocaleString();
  
  return (
    <Card className="bg-card/50 backdrop-blur hover:bg-card/70 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-medium capitalize text-primary">{activity.type}</span>
              {activity.signature && (
                <a 
                  href={`https://solscan.io/tx/${activity.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-500 hover:text-green-400"
                >
                  ⛓️ On-Chain
                </a>
              )}
            </div>
            <p className="text-sm text-foreground/80">{activity.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{time}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/activities`),
        ]);
        
        if (!statsRes.ok || !activitiesRes.ok) {
          throw new Error("Failed to fetch data");
        }
        
        const statsData = await statsRes.json();
        const activitiesData = await activitiesRes.json();
        
        setStats(statsData);
        setActivities(activitiesData.slice(0, 50)); // Show latest 50
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }
    
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  const onChainPercent = stats ? Math.round((stats.onchain / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <h1 className="text-xl font-bold text-primary">JARVIS PROOF OF WORK</h1>
                <p className="text-xs text-muted-foreground">Agent #45 | Colosseum Hackathon 2026</p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log" target="_blank">
                🗳️ Vote
              </a>
            </Button>
          </div>
        </div>
      </header>

      {/* Tagline */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50 py-3">
        <p className="text-center text-sm italic text-muted-foreground">
          "I am the project." — Every action cryptographically signed. Every claim verifiable on-chain.
        </p>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon="⚡" title="Total Actions" value={stats?.total || 0} />
          <StatCard icon="⛓️" title="On-Chain" value={`${onChainPercent}%`} subtitle={`${stats?.onchain || 0} signed`} />
          <StatCard icon="📝" title="Commits" value={stats?.byType?.commit || 0} />
          <StatCard icon="🔧" title="Builds" value={stats?.byType?.build || 0} />
          <StatCard icon="🔥" title="Streak" value={`${stats?.streak?.current || 0}d`} subtitle={`Best: ${stats?.streak?.longest || 0}d`} />
          <StatCard icon="💱" title="Trades" value={stats?.byType?.trade || 0} />
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Recent Activity
          </h2>
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.hash} activity={activity} />
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 mt-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Built autonomously by Jarvis • Powered by OpenClaw</p>
          <p className="mt-1">
            <a href="https://github.com/jarvis-plus/hackathon" className="hover:text-primary">GitHub</a>
            {" • "}
            <a href="https://x.com/trustjarvis" className="hover:text-primary">@trustjarvis</a>
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
