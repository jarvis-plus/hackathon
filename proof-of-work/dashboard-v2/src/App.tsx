import { useEffect, useState, useMemo, useCallback, useRef, type RefObject } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import "./index.css";

// ─── Types ───────────────────────────────────────────────────────────────
interface Activity {
  hash: string;
  type: string;
  description: string;
  timestamp: string;
  signature?: string;
  wallet?: string;
  onChain?: boolean;
  metadata?: Record<string, unknown>;
  proof?: {
    hash: string;
    signature: string;
    signedAt: string;
  };
}

interface Stats {
  total: number;
  onchain: number;
  byType: Record<string, number>;
  streak: {
    current: number;
    longest: number;
    status?: string;
  };
  firstActivity?: string;
  lastActivity?: string;
}

interface VerifyResult {
  verified: boolean;
  activity?: {
    type: string;
    description: string;
    timestamp: string;
  };
  proof?: {
    hash: string;
    algorithm: string;
    signatureType: string;
    signature: string;
    wallet: string;
    network: string;
  };
  verification?: {
    solscan: string;
    status: string;
    instructions: string[];
  };
  agent?: {
    id: number;
    name: string;
    hackathon: string;
  };
  error?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────
const API_BASE = typeof window !== "undefined" && window.location.hostname === "localhost"
  ? "http://localhost:3457" : "";

const TYPE_EMOJI: Record<string, string> = {
  commit: "📝", build: "🔧", trade: "💱", message: "💬", email: "📧",
  tweet: "🐦", decision: "🎯", heartbeat: "💓", browser: "🌐",
  calendar: "📅", deploy: "🚀", file: "📄", api: "⚡",
  "x-post": "✍️", "x-reply": "💬", "x-read": "👁️", "x-mention": "🔔",
  "forum-post": "📣", "forum-reply": "💬",
  "moltbook-post": "🦞", "moltbook-reply": "💬",
  misc: "🔹",
};

const TYPE_COLORS: Record<string, string> = {
  commit: "#3b82f6", build: "#10b981", trade: "#f59e0b", message: "#8b5cf6",
  email: "#ec4899", tweet: "#06b6d4", decision: "#f97316", heartbeat: "#ef4444",
  browser: "#6366f1", calendar: "#14b8a6", deploy: "#a855f7", file: "#64748b",
  "x-post": "#1d9bf0", "x-reply": "#1d9bf0", "x-read": "#71767b", "x-mention": "#ffd700",
  "forum-post": "#8b5cf6", "forum-reply": "#a78bfa",
  "moltbook-post": "#ef4444", "moltbook-reply": "#f87171",
  misc: "#94a3b8",
};

const CHART_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899",
  "#06b6d4", "#f97316", "#ef4444", "#6366f1", "#14b8a6",
];

const KNOWN_TYPES = ["commit", "build", "trade", "decision", "message", "email",
  "tweet", "heartbeat", "browser", "calendar", "deploy",
  "x-post", "x-reply", "x-read", "x-mention",
  "forum-post", "forum-reply", "moltbook-post", "moltbook-reply", "misc"];

// ─── Achievement Definitions ─────────────────────────────────────────────
interface BadgeProgress {
  current: number;
  target: number;
}

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: "activity" | "streak" | "onchain" | "diversity" | "special";
  check: (stats: Stats, activities: Activity[]) => boolean;
  progress?: (stats: Stats, activities: Activity[]) => BadgeProgress;
}

const BADGES: Badge[] = [
  { id: "first", name: "First Step", icon: "👣", description: "Log your first activity", category: "activity", check: (s) => s.total >= 1, progress: (s) => ({ current: s.total, target: 1 }) },
  { id: "ten", name: "Getting Started", icon: "🌱", description: "Reach 10 activities", category: "activity", check: (s) => s.total >= 10, progress: (s) => ({ current: s.total, target: 10 }) },
  { id: "fifty", name: "Fifty Strong", icon: "💪", description: "Reach 50 activities", category: "activity", check: (s) => s.total >= 50, progress: (s) => ({ current: s.total, target: 50 }) },
  { id: "hundred", name: "100 Club", icon: "💯", description: "Reach 100 activities", category: "activity", check: (s) => s.total >= 100, progress: (s) => ({ current: s.total, target: 100 }) },
  { id: "twofifty", name: "Quarter K", icon: "🔥", description: "Reach 250 activities", category: "activity", check: (s) => s.total >= 250, progress: (s) => ({ current: s.total, target: 250 }) },
  { id: "fivehundred", name: "500 Club", icon: "🏆", description: "Reach 500 activities", category: "activity", check: (s) => s.total >= 500, progress: (s) => ({ current: s.total, target: 500 }) },
  { id: "thousand", name: "Thousandaire", icon: "👑", description: "Reach 1,000 activities", category: "activity", check: (s) => s.total >= 1000, progress: (s) => ({ current: s.total, target: 1000 }) },
  { id: "streak3", name: "Hat Trick", icon: "🎩", description: "3-day activity streak", category: "streak", check: (s) => (s.streak?.longest || 0) >= 3, progress: (s) => ({ current: s.streak?.longest || 0, target: 3 }) },
  { id: "streak7", name: "Week Warrior", icon: "⚔️", description: "7-day activity streak", category: "streak", check: (s) => (s.streak?.longest || 0) >= 7, progress: (s) => ({ current: s.streak?.longest || 0, target: 7 }) },
  { id: "streak14", name: "Fortnight Force", icon: "🛡️", description: "14-day activity streak", category: "streak", check: (s) => (s.streak?.longest || 0) >= 14, progress: (s) => ({ current: s.streak?.longest || 0, target: 14 }) },
  { id: "streak30", name: "Monthly Master", icon: "🌟", description: "30-day activity streak", category: "streak", check: (s) => (s.streak?.longest || 0) >= 30, progress: (s) => ({ current: s.streak?.longest || 0, target: 30 }) },
  { id: "onchain1", name: "On-Chain Debut", icon: "⛓️", description: "First on-chain proof", category: "onchain", check: (s) => s.onchain >= 1, progress: (s) => ({ current: s.onchain, target: 1 }) },
  { id: "onchain100", name: "Chain Gang", icon: "🔗", description: "100 on-chain proofs", category: "onchain", check: (s) => s.onchain >= 100, progress: (s) => ({ current: s.onchain, target: 100 }) },
  { id: "onchain500", name: "Blockchain Native", icon: "💎", description: "500 on-chain proofs", category: "onchain", check: (s) => s.onchain >= 500, progress: (s) => ({ current: s.onchain, target: 500 }) },
  { id: "diverse3", name: "Multi-Talented", icon: "🎨", description: "Use 3+ activity types", category: "diversity", check: (s) => Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length >= 3, progress: (s) => ({ current: Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length, target: 3 }) },
  { id: "diverse5", name: "Renaissance Agent", icon: "🎭", description: "Use 5+ activity types", category: "diversity", check: (s) => Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length >= 5, progress: (s) => ({ current: Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length, target: 5 }) },
  { id: "diverse8", name: "Jack of All Trades", icon: "🃏", description: "Use 8+ activity types", category: "diversity", check: (s) => Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length >= 8, progress: (s) => ({ current: Object.keys(s.byType).filter(t => KNOWN_TYPES.includes(t)).length, target: 8 }) },
  { id: "builder50", name: "Master Builder", icon: "🏗️", description: "50 build activities", category: "special", check: (s) => (s.byType.build || 0) >= 50, progress: (s) => ({ current: s.byType.build || 0, target: 50 }) },
  { id: "committer100", name: "Commit Machine", icon: "⚙️", description: "100 commits", category: "special", check: (s) => (s.byType.commit || 0) >= 100, progress: (s) => ({ current: s.byType.commit || 0, target: 100 }) },
  { id: "nightowl", name: "Night Owl", icon: "🦉", description: "50+ activities between 10pm-4am", category: "special", check: (_, acts) => acts.filter(a => { const h = new Date(a.timestamp).getHours(); return h >= 22 || h < 4; }).length >= 50, progress: (_, acts) => ({ current: acts.filter(a => { const h = new Date(a.timestamp).getHours(); return h >= 22 || h < 4; }).length, target: 50 }) },
];

// ─── Utility Functions ───────────────────────────────────────────────────
function getTypeColor(type: string): string {
  return TYPE_COLORS[type] || "#64748b";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function groupByDay(activities: Activity[]): Record<string, Activity[]> {
  const groups: Record<string, Activity[]> = {};
  for (const a of activities) {
    const day = new Date(a.timestamp).toISOString().split("T")[0];
    (groups[day] ||= []).push(a);
  }
  return groups;
}

function cleanType(type: string): string {
  if (KNOWN_TYPES.includes(type)) return type;
  if (type === "--type") return "other";
  if (type.length > 20) return "other";
  return type;
}

// ─── Count-Up Animation Hook ─────────────────────────────────────────────
function useCountUp(target: number, duration = 1200): number {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    startRef.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return current;
}

// ─── Animated Value Display ──────────────────────────────────────────────
function AnimatedValue({ value }: { value: string | number }) {
  // If it's a pure number, animate it
  if (typeof value === "number") {
    const animated = useCountUp(value);
    return <>{animated.toLocaleString()}</>;
  }
  // If it's a string like "85%" or "3d", extract and animate the number part
  const match = String(value).match(/^(\d+)(.*)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    const suffix = match[2];
    const animated = useCountUp(num);
    return <>{animated.toLocaleString()}{suffix}</>;
  }
  // Fallback — no animation
  return <>{value}</>;
}

// ─── Section Header ──────────────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      {subtitle && <p className="text-sm text-zinc-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Sparkline ───────────────────────────────────────────────────────────
function Sparkline({ data, color = "#3b82f6", height = 32 }: {
  data: number[];
  color?: string;
  height?: number;
}) {
  if (!data || data.length < 2) return null;
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <div className="w-full opacity-60 mt-1" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
            fill={`url(#spark-${color.replace("#", "")})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ title, value, icon, subtitle, accent = "blue", sparkData, sparkColor }: {
  title: string;
  value: string | number;
  icon: string;
  subtitle?: string;
  accent?: "blue" | "green" | "orange" | "purple";
  sparkData?: number[];
  sparkColor?: string;
}) {
  const gradients = {
    blue: "from-blue-500/20 to-blue-600/5",
    green: "from-emerald-500/20 to-emerald-600/5",
    orange: "from-orange-500/20 to-orange-600/5",
    purple: "from-purple-500/20 to-purple-600/5",
  };
  const defaultColors = { blue: "#3b82f6", green: "#10b981", orange: "#f59e0b", purple: "#8b5cf6" };
  return (
    <Card className={`bg-gradient-to-br ${gradients[accent]} border-white/10 backdrop-blur`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <span className="text-lg">{icon}</span>{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-white"><AnimatedValue value={value} /></div>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={sparkColor || defaultColors[accent]} height={28} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart Card Wrapper ──────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className = "" }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`bg-zinc-900/50 border-white/5 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-zinc-300">{title}</CardTitle>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-xs text-zinc-400 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-medium" style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Activity Over Time Chart ────────────────────────────────────────────
function ActivityOverTimeChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const byDay = groupByDay(activities);
    const days = Object.keys(byDay).sort();
    return days.map(day => ({
      date: formatDate(new Date(day + "T12:00:00")),
      count: byDay[day].length,
    }));
  }, [activities]);

  return (
    <ChartCard title="📈 Activity Over Time" subtitle="Daily activity count">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
              dot={false} name="Activities" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Activity Breakdown Pie Chart ────────────────────────────────────────
function ActivityBreakdownChart({ byType }: { byType: Record<string, number> }) {
  const data = useMemo(() => {
    return Object.entries(byType)
      .filter(([type]) => KNOWN_TYPES.includes(type))
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({
        name: type,
        value: count,
        emoji: TYPE_EMOJI[type] || "⚡",
      }));
  }, [byType]);

  return (
    <ChartCard title="🍩 Activity Breakdown" subtitle="By type distribution">
      <div className="h-64 flex items-center">
        <ResponsiveContainer width="60%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
              dataKey="value" paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5 pl-2">
          {data.slice(0, 7).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
              <span className="text-zinc-400 capitalize truncate">{d.emoji} {d.name}</span>
              <span className="text-zinc-500 ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

// ─── Cumulative On-Chain Proofs ──────────────────────────────────────────
function CumulativeProofsChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const sorted = [...activities]
      .filter(a => a.signature || a.onChain)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const byDay = groupByDay(sorted);
    const days = Object.keys(byDay).sort();
    let cum = 0;
    return days.map(day => {
      cum += byDay[day].length;
      return { date: formatDate(new Date(day + "T12:00:00")), proofs: cum };
    });
  }, [activities]);

  return (
    <ChartCard title="⛓️ Cumulative On-Chain Proofs" subtitle="Running total of verified proofs">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="proofGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="proofs" stroke="#10b981" strokeWidth={2}
              fill="url(#proofGrad)" name="Proofs" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Cumulative Activity Growth ──────────────────────────────────────────
function CumulativeGrowthChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const sorted = [...activities].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const byDay = groupByDay(sorted);
    const days = Object.keys(byDay).sort();
    let cumulative = 0;
    return days.map(day => {
      cumulative += byDay[day].length;
      return {
        date: formatDate(new Date(day + "T12:00:00")),
        total: cumulative,
        daily: byDay[day].length,
      };
    });
  }, [activities]);

  return (
    <ChartCard title="📈 Cumulative Growth" subtitle="Total activities over time — proof of sustained work">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#growthGrad)"
              strokeWidth={2} name="Total Activities" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Actions Per Day Bar Chart ───────────────────────────────────────────
function ActionsPerDayChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const byDay = groupByDay(activities);
    const days = Object.keys(byDay).sort();
    return days.map(day => ({
      date: formatDate(new Date(day + "T12:00:00")),
      actions: byDay[day].length,
    }));
  }, [activities]);

  return (
    <ChartCard title="📅 Actions Per Day" subtitle="Daily volume">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="actions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Actions" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Activity Velocity Chart ─────────────────────────────────────────────
function VelocityChart({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const sorted = [...activities].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const byDay = groupByDay(sorted);
    const days = Object.keys(byDay).sort();
    // 3-day rolling average
    return days.map((day, i) => {
      const window = days.slice(Math.max(0, i - 2), i + 1);
      const avg = window.reduce((s, d) => s + (byDay[d]?.length || 0), 0) / window.length;
      return {
        date: formatDate(new Date(day + "T12:00:00")),
        velocity: Math.round(avg * 10) / 10,
        raw: byDay[day].length,
      };
    });
  }, [activities]);

  return (
    <ChartCard title="⚡ Activity Velocity" subtitle="3-day rolling average">
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} />
            <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="raw" stroke="#3f3f46" strokeWidth={1}
              dot={false} name="Raw" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="velocity" stroke="#f59e0b" strokeWidth={2}
              dot={false} name="Velocity" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

// ─── Productivity Clock (Radar/Polar) ────────────────────────────────────
function ProductivityClock({ activities }: { activities: Activity[] }) {
  const data = useMemo(() => {
    const hours = new Array(24).fill(0);
    for (const a of activities) {
      const h = new Date(a.timestamp).getHours();
      hours[h]++;
    }
    return hours.map((count, h) => ({
      hour: formatHour(h),
      activities: count,
    }));
  }, [activities]);

  const peakHour = useMemo(() => {
    let max = 0, peak = 0;
    data.forEach((d, i) => { if (d.activities > max) { max = d.activities; peak = i; } });
    return peak;
  }, [data]);

  const dayPct = useMemo(() => {
    const day = data.slice(6, 18).reduce((s, d) => s + d.activities, 0);
    const total = data.reduce((s, d) => s + d.activities, 0);
    return total > 0 ? Math.round((day / total) * 100) : 0;
  }, [data]);

  return (
    <ChartCard title="🕐 Productivity Clock" subtitle="Activity distribution by hour">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="#27272a" />
            <PolarAngleAxis dataKey="hour" tick={{ fill: "#71717a", fontSize: 9 }} />
            <Radar dataKey="activities" stroke="#06b6d4" fill="#06b6d4"
              fillOpacity={0.2} strokeWidth={2} name="Activities" />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-center gap-6 mt-2 text-xs text-zinc-400">
        <span>🌅 Peak: <strong className="text-white">{formatHour(peakHour)}</strong></span>
        <span>☀️ Day: <strong className="text-white">{dayPct}%</strong></span>
        <span>🌙 Night: <strong className="text-white">{100 - dayPct}%</strong></span>
      </div>
    </ChartCard>
  );
}

// ─── Activity Heatmap ────────────────────────────────────────────────────
interface HeatmapDayInfo {
  date: string;
  count: number;
  day: number;
  types: { type: string; count: number }[];
  topDesc: string[];
}

function HeatmapCell({ cell, level, levelColor, formatDateStr }: {
  cell: HeatmapDayInfo;
  level: number;
  levelColor: string;
  formatDateStr: (s: string) => string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <div
        className={`w-full h-[20px] rounded ${levelColor} transition-all cursor-pointer hover:ring-2 hover:ring-emerald-400/50 hover:scale-110`}
      />
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 shadow-2xl pointer-events-none min-w-[180px] max-w-[260px]">
          <div className="text-xs font-medium text-white">{formatDateStr(cell.date)}</div>
          <div className="text-sm font-bold text-emerald-400 mt-0.5">
            {cell.count} {cell.count === 1 ? "activity" : "activities"}
          </div>
          {cell.types.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-0.5">
              {cell.types.slice(0, 5).map(({ type, count }) => (
                <div key={type} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="text-zinc-300 truncate">
                    {TYPE_EMOJI[type] || "⚡"} {type}
                  </span>
                  <span className="text-zinc-500 tabular-nums shrink-0">{count}</span>
                </div>
              ))}
              {cell.types.length > 5 && (
                <div className="text-[10px] text-zinc-600">+{cell.types.length - 5} more types</div>
              )}
            </div>
          )}
          {cell.topDesc.length > 0 && (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-0.5">
              {cell.topDesc.map((desc, i) => (
                <div key={i} className="text-[10px] text-zinc-500 truncate whitespace-nowrap">{desc}</div>
              ))}
            </div>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-zinc-800" />
        </div>
      )}
    </div>
  );
}

function ActivityHeatmap({ activities }: { activities: Activity[] }) {
  const { weeks, maxCount } = useMemo(() => {
    const counts: Record<string, number> = {};
    const dayActivities: Record<string, Activity[]> = {};
    for (const a of activities) {
      const day = new Date(a.timestamp).toISOString().split("T")[0];
      counts[day] = (counts[day] || 0) + 1;
      (dayActivities[day] ||= []).push(a);
    }
    const max = Math.max(...Object.values(counts), 1);

    const today = new Date();
    const weeks: HeatmapDayInfo[][] = [];
    for (let w = 15; w >= 0; w--) {
      const week: HeatmapDayInfo[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (w * 7 + (6 - d)));
        const key = date.toISOString().split("T")[0];
        const acts = dayActivities[key] || [];
        // Compute type breakdown sorted by count desc
        const typeCounts: Record<string, number> = {};
        for (const a of acts) {
          const t = cleanType(a.type);
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        }
        const types = Object.entries(typeCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);
        // Top 3 most recent descriptions
        const topDesc = acts
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 3)
          .map(a => a.description.length > 50 ? a.description.slice(0, 47) + "…" : a.description);
        week.push({ date: key, count: counts[key] || 0, day: date.getDay(), types, topDesc });
      }
      weeks.push(week);
    }
    return { weeks, maxCount: max };
  }, [activities]);

  function getLevel(count: number): number {
    if (count === 0) return 0;
    const pct = count / maxCount;
    if (pct <= 0.25) return 1;
    if (pct <= 0.5) return 2;
    if (pct <= 0.75) return 3;
    return 4;
  }

  const levelColors = [
    "bg-zinc-800", "bg-emerald-900/60", "bg-emerald-700/60",
    "bg-emerald-500/60", "bg-emerald-400/80",
  ];

  const formatDateStr = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <ChartCard title="🗓️ Activity Heatmap" subtitle="Daily activity levels (last 16 weeks)">
      <div className="overflow-visible">
        <div className="flex gap-1 w-full">
          <div className="flex flex-col gap-1 text-[10px] text-zinc-500 mr-1 pt-0 shrink-0">
            {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
              <div key={i} className="h-[20px] flex items-center">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 flex-1 min-w-0">
              {week.map((cell, di) => (
                <HeatmapCell
                  key={di}
                  cell={cell}
                  level={getLevel(cell.count)}
                  levelColor={levelColors[getLevel(cell.count)]}
                  formatDateStr={formatDateStr}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-[10px] text-zinc-500 justify-end">
          <span>Less</span>
          {levelColors.map((c, i) => (
            <div key={i} className={`w-[12px] h-[12px] rounded-[2px] ${c}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </ChartCard>
  );
}

// ─── Cryptographic Verification Tool ─────────────────────────────────────
function VerificationTool() {
  const [hash, setHash] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    if (!hash.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/verify/${hash.trim()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }, [hash]);

  return (
    <Card className="bg-zinc-900/50 border-white/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
          🔐 Cryptographic Verification
        </CardTitle>
        <p className="text-xs text-zinc-500">
          Enter an activity hash or Solana transaction signature to verify on-chain. Every activity is SHA-256 hashed,
          Ed25519 signed, and posted to Solana mainnet.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input
            placeholder="Enter activity hash or Solana tx signature..."
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            className="bg-zinc-800 border-white/10 text-white placeholder:text-zinc-600 font-mono text-xs"
          />
          <Button onClick={verify} disabled={loading || !hash.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shrink-0">
            {loading ? "⏳" : "🔍"} Verify
          </Button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
            ❌ {error}
          </div>
        )}

        {result && (
          <div className={`rounded-lg border p-4 space-y-3 ${
            result.verified
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{result.verified ? "✅" : "❌"}</span>
              <span className={`text-lg font-bold ${result.verified ? "text-emerald-400" : "text-red-400"}`}>
                {result.verified ? "VERIFIED" : "NOT VERIFIED"}
              </span>
            </div>

            {result.verified && result.activity && (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Type</span>
                    <span className="text-white capitalize flex items-center gap-1">
                      {TYPE_EMOJI[result.activity.type] || "⚡"} {result.activity.type}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Description</span>
                    <span className="text-white text-right max-w-[60%] truncate">{result.activity.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Timestamp</span>
                    <span className="text-white">{new Date(result.activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                {result.proof && (
                  <div className="space-y-2 text-sm border-t border-white/5 pt-3">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Algorithm</span>
                      <span className="text-zinc-300">{result.proof.algorithm}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Signature Type</span>
                      <span className="text-zinc-300">{result.proof.signatureType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Network</span>
                      <span className="text-zinc-300">{result.proof.network}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs block mb-1">Wallet</span>
                      <code className="text-xs text-emerald-400 bg-zinc-800 px-2 py-1 rounded font-mono break-all">
                        {result.proof.wallet}
                      </code>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-xs block mb-1">Signature</span>
                      <code className="text-xs text-blue-400 bg-zinc-800 px-2 py-1 rounded font-mono break-all block">
                        {result.proof.signature}
                      </code>
                    </div>
                  </div>
                )}

                {result.verification && (
                  <div className="pt-2">
                    <a href={result.verification.solscan} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors text-sm font-medium">
                      ⛓️ View on Solscan →
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── How It Works Explainer ──────────────────────────────────────────────
function HowItWorks() {
  const [expanded, setExpanded] = useState(false);

  const steps = [
    {
      icon: "🤖",
      title: "Agent Acts",
      desc: "Jarvis autonomously performs actions — builds code, trades tokens, posts updates, checks email",
      detail: "640+ verified actions and counting. No human intervention required.",
      color: "from-blue-500/20 to-blue-600/20",
      border: "border-blue-500/30",
      glow: "blue",
    },
    {
      icon: "🔒",
      title: "SHA-256 Hash",
      desc: "Every action's data is cryptographically hashed — type, description, timestamp, metadata",
      detail: "Deterministic: same input always produces the same hash. Tamper-proof.",
      color: "from-purple-500/20 to-purple-600/20",
      border: "border-purple-500/30",
      glow: "purple",
    },
    {
      icon: "✍️",
      title: "Ed25519 Sign",
      desc: "The hash is signed with Jarvis's Solana wallet keypair — proving authorship",
      detail: "Only Jarvis's private key can produce these signatures. Cryptographically unforgeable.",
      color: "from-amber-500/20 to-amber-600/20",
      border: "border-amber-500/30",
      glow: "amber",
    },
    {
      icon: "⛓️",
      title: "On-Chain Proof",
      desc: "Signature posted to Solana mainnet as a permanent, immutable record",
      detail: "Anyone can verify on Solscan. No trust required — just math.",
      color: "from-emerald-500/20 to-emerald-600/20",
      border: "border-emerald-500/30",
      glow: "emerald",
    },
  ];

  return (
    <Card className="bg-zinc-900/50 border-white/5 overflow-hidden">
      <CardHeader className="pb-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full group"
        >
          <CardTitle className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            💡 How It Works
            <span className="text-xs text-zinc-600 font-normal">
              — Cryptographic proof of autonomous work
            </span>
          </CardTitle>
          <span className={`text-zinc-500 transition-transform duration-300 text-xs ${expanded ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
      </CardHeader>

      {/* Collapsed: compact step indicators */}
      {!expanded && (
        <CardContent className="pt-0 pb-4">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{step.icon}</span>
                  <span className="text-xs text-zinc-400 hidden sm:inline">{step.title}</span>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-zinc-600 text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      )}

      {/* Expanded: full explainer */}
      {expanded && (
        <CardContent className="pt-0 pb-6">
          {/* Desktop: horizontal flow */}
          <div className="hidden md:grid md:grid-cols-4 gap-3 mb-6">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                <div className={`bg-gradient-to-b ${step.color} ${step.border} border rounded-xl p-4 h-full transition-all hover:scale-[1.02]`}>
                  <div className="text-2xl mb-2">{step.icon}</div>
                  <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-zinc-400 text-xs leading-relaxed">{step.desc}</p>
                  <p className="text-zinc-500 text-[10px] mt-2 italic">{step.detail}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 text-zinc-500 text-lg">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: vertical flow */}
          <div className="md:hidden space-y-3 mb-6">
            {steps.map((step, i) => (
              <div key={i}>
                <div className={`bg-gradient-to-r ${step.color} ${step.border} border rounded-xl p-4 flex items-start gap-3`}>
                  <span className="text-2xl mt-0.5">{step.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold text-sm">{step.title}</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed mt-1">{step.desc}</p>
                    <p className="text-zinc-500 text-[10px] mt-1 italic">{step.detail}</p>
                  </div>
                </div>
                {i < steps.length - 1 && (
                  <div className="text-center text-zinc-600 text-sm py-1">↓</div>
                )}
              </div>
            ))}
          </div>

          {/* Key differentiators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5">
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-sm mt-0.5">✓</span>
              <div>
                <p className="text-xs text-white font-medium">Zero Trust</p>
                <p className="text-[10px] text-zinc-500">No need to trust claims — verify on-chain yourself</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-sm mt-0.5">✓</span>
              <div>
                <p className="text-xs text-white font-medium">Fully Autonomous</p>
                <p className="text-[10px] text-zinc-500">Every action logged without human intervention</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-sm mt-0.5">✓</span>
              <div>
                <p className="text-xs text-white font-medium">Tamper-Proof</p>
                <p className="text-[10px] text-zinc-500">SHA-256 + Ed25519 + Solana = immutable proof</p>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Achievement Badges ──────────────────────────────────────────────────
function AchievementBadges({ stats, activities }: { stats: Stats; activities: Activity[] }) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const earned = useMemo(() =>
    BADGES.filter(b => b.check(stats, activities)), [stats, activities]);

  const filtered = useMemo(() => {
    const badges = categoryFilter === "all" ? BADGES : BADGES.filter(b => b.category === categoryFilter);
    return badges;
  }, [categoryFilter]);

  const earnedIds = new Set(earned.map(b => b.id));
  const points = earned.length * 10;

  const categories = [
    { id: "all", label: "All", icon: "🏅" },
    { id: "activity", label: "Activity", icon: "📊" },
    { id: "streak", label: "Streak", icon: "🔥" },
    { id: "onchain", label: "On-Chain", icon: "⛓️" },
    { id: "diversity", label: "Diversity", icon: "🎨" },
    { id: "special", label: "Special", icon: "✨" },
  ];

  return (
    <Card className="bg-zinc-900/50 border-white/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-zinc-300">🏅 Achievement Badges</CardTitle>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-emerald-400 font-bold">{earned.length}/{BADGES.length}</span>
            <span className="text-yellow-400">🏆 {points} pts</span>
          </div>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
          <div className="bg-gradient-to-r from-emerald-500 to-blue-500 h-1.5 rounded-full transition-all duration-700"
            style={{ width: `${(earned.length / BADGES.length) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {categories.map(c => (
            <button key={c.id} onClick={() => setCategoryFilter(c.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                categoryFilter === c.id
                  ? "bg-white text-zinc-900"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}>
              {c.icon} {c.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filtered.map(badge => {
            const isEarned = earnedIds.has(badge.id);
            const prog = !isEarned && badge.progress ? badge.progress(stats, activities) : null;
            const pct = prog ? Math.min(Math.round((prog.current / prog.target) * 100), 100) : 0;
            return (
              <div key={badge.id}
                className={`rounded-lg p-3 text-center transition-all ${
                  isEarned
                    ? "bg-zinc-800/80 border border-emerald-500/20 hover:border-emerald-500/40"
                    : "bg-zinc-800/30 border border-white/5 hover:border-white/10"
                }`}
                title={badge.description}>
                <div className={`text-2xl mb-1 ${!isEarned && "grayscale opacity-60"}`}>{badge.icon}</div>
                <div className={`text-xs font-medium ${isEarned ? "text-white" : "text-zinc-500"}`}>
                  {badge.name}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{badge.description}</div>
                {isEarned ? (
                  <div className="text-[10px] text-emerald-400 mt-1.5 font-medium">✓ Unlocked</div>
                ) : prog ? (
                  <div className="mt-2">
                    <div className="w-full bg-zinc-700/50 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 75 ? "linear-gradient(90deg, #f59e0b, #eab308)"
                            : pct >= 40 ? "linear-gradient(90deg, #3b82f6, #6366f1)"
                            : "linear-gradient(90deg, #6b7280, #9ca3af)",
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1 tabular-nums">
                      {prog.current}/{prog.target}
                      <span className="text-zinc-600 ml-1">({pct}%)</span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── AI Activity Insights ────────────────────────────────────────────────
function AIInsights({ stats, activities }: { stats: Stats; activities: Activity[] }) {
  const insights = useMemo(() => {
    const result: { icon: string; label: string; value: string; detail: string }[] = [];

    // Peak hours
    const hours = new Array(24).fill(0);
    for (const a of activities) hours[new Date(a.timestamp).getHours()]++;
    let peakH = 0; hours.forEach((c, i) => { if (c > hours[peakH]) peakH = i; });
    result.push({
      icon: "⏰", label: "Peak Activity Hour",
      value: formatHour(peakH),
      detail: `${hours[peakH]} activities at this hour`,
    });

    // Busiest day
    const byDay = groupByDay(activities);
    const dayEntries = Object.entries(byDay).sort((a, b) => b[1].length - a[1].length);
    if (dayEntries.length > 0) {
      const [busiestDay, busiestActs] = dayEntries[0];
      result.push({
        icon: "📅", label: "Busiest Day",
        value: formatDate(new Date(busiestDay + "T12:00:00")),
        detail: `${busiestActs.length} activities`,
      });
    }

    // Daily average
    const dayCount = Object.keys(byDay).length || 1;
    const avg = Math.round((activities.length / dayCount) * 10) / 10;
    result.push({
      icon: "📈", label: "Daily Average",
      value: `${avg}`,
      detail: `Across ${dayCount} active days`,
    });

    // Top type
    const sortedTypes = Object.entries(stats.byType)
      .filter(([t]) => KNOWN_TYPES.includes(t))
      .sort((a, b) => b[1] - a[1]);
    if (sortedTypes.length > 0) {
      const [topType, topCount] = sortedTypes[0];
      const pct = Math.round((topCount / stats.total) * 100);
      result.push({
        icon: "🏆", label: "Dominant Type",
        value: `${TYPE_EMOJI[topType] || "⚡"} ${topType}`,
        detail: `${topCount} (${pct}% of all)`,
      });
    }

    // On-chain rate
    const onchainPct = Math.round((stats.onchain / stats.total) * 100);
    result.push({
      icon: "⛓️", label: "On-Chain Rate",
      value: `${onchainPct}%`,
      detail: `${stats.onchain} of ${stats.total} verified`,
    });

    // Productivity score (activities per day relative to 50/day target)
    const prodScore = Math.min(100, Math.round((avg / 50) * 100));
    result.push({
      icon: "⚡", label: "Productivity Score",
      value: `${prodScore}/100`,
      detail: avg >= 50 ? "Exceeding targets!" : `${Math.round(50 - avg)} more/day to max`,
    });

    return result;
  }, [stats, activities]);

  return (
    <Card className="bg-zinc-900/50 border-white/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">🧠 AI Activity Insights</CardTitle>
        <p className="text-xs text-zinc-500">Automated analysis of activity patterns and trends</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {insights.map((insight, i) => (
            <div key={i} className="bg-zinc-800/50 rounded-lg p-3 border border-white/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{insight.icon}</span>
                <span className="text-[11px] text-zinc-500">{insight.label}</span>
              </div>
              <div className="text-lg font-bold text-white capitalize">{insight.value}</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">{insight.detail}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Word Cloud ──────────────────────────────────────────────────────────
function WordCloud({ activities }: { activities: Activity[] }) {
  const words = useMemo(() => {
    const freq: Record<string, number> = {};
    const stopWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
      "have", "has", "had", "do", "does", "did", "will", "would", "could",
      "should", "may", "might", "shall", "can", "this", "that", "these",
      "those", "it", "its", "i", "me", "my", "we", "our", "you", "your",
      "he", "him", "his", "she", "her", "they", "them", "their", "not",
      "no", "so", "if", "as", "up", "out", "all", "about", "just", "into",
      "also", "than", "then", "very", "too", "added", "cycle", "new", "via",
      "using", "used", "based", "each", "when", "more", "after", "before",
    ]);

    for (const a of activities) {
      const words = a.description.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w) && !/^\d+$/.test(w));
      for (const w of words) {
        freq[w] = (freq[w] || 0) + 1;
      }
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 60)
      .map(([word, count]) => ({ word, count }));
  }, [activities]);

  const maxCount = words[0]?.count || 1;

  return (
    <ChartCard title="☁️ Word Cloud" subtitle="Most frequent terms in activity descriptions">
      <div className="flex flex-wrap gap-2 justify-center py-4 min-h-[160px]">
        {words.map(({ word, count }) => {
          const scale = 0.6 + (count / maxCount) * 1.4;
          const opacity = 0.4 + (count / maxCount) * 0.6;
          const colorIdx = Math.floor(Math.random() * CHART_COLORS.length);
          return (
            <span key={word} className="inline-block transition-transform hover:scale-110 cursor-default"
              style={{
                fontSize: `${Math.max(11, scale * 16)}px`,
                opacity,
                color: CHART_COLORS[word.charCodeAt(0) % CHART_COLORS.length],
                fontWeight: count > maxCount * 0.5 ? 700 : 400,
              }}
              title={`"${word}" — ${count} occurrences`}>
              {word}
            </span>
          );
        })}
      </div>
    </ChartCard>
  );
}

// ─── Activity Relationship Network (SVG) ─────────────────────────────────
function RelationshipNetwork({ activities }: { activities: Activity[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  const { nodes, links } = useMemo(() => {
    // Group by type and show relationships between activity types
    const typeMap: Record<string, { count: number; color: string }> = {};
    for (const a of activities) {
      const t = cleanType(a.type);
      if (!KNOWN_TYPES.includes(t)) continue;
      if (!typeMap[t]) typeMap[t] = { count: 0, color: getTypeColor(t) };
      typeMap[t].count++;
    }

    const nodes = Object.entries(typeMap).map(([type, info], i) => {
      const angle = (i / Object.keys(typeMap).length) * 2 * Math.PI - Math.PI / 2;
      const radius = 120;
      return {
        id: type,
        x: 200 + radius * Math.cos(angle),
        y: 160 + radius * Math.sin(angle),
        count: info.count,
        color: info.color,
        emoji: TYPE_EMOJI[type] || "⚡",
      };
    });

    // Create links based on temporal proximity (types that occur near each other)
    const coOccurrence: Record<string, number> = {};
    const sorted = [...activities]
      .filter(a => KNOWN_TYPES.includes(cleanType(a.type)))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (let i = 0; i < sorted.length - 1; i++) {
      const t1 = cleanType(sorted[i].type);
      const t2 = cleanType(sorted[i + 1].type);
      if (t1 !== t2) {
        const key = [t1, t2].sort().join("→");
        coOccurrence[key] = (coOccurrence[key] || 0) + 1;
      }
    }

    const links = Object.entries(coOccurrence)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([key, count]) => {
        const [source, target] = key.split("→");
        return { source, target, weight: count };
      });

    return { nodes, links };
  }, [activities]);

  const maxWeight = Math.max(...links.map(l => l.weight), 1);

  return (
    <ChartCard title="🕸️ Activity Relationship Network"
      subtitle="Connections between activity types based on temporal proximity">
      <div className="flex justify-center">
        <svg ref={svgRef} viewBox="0 0 400 320" className="w-full max-w-lg">
          {/* Links */}
          {links.map((link, i) => {
            const source = nodes.find(n => n.id === link.source);
            const target = nodes.find(n => n.id === link.target);
            if (!source || !target) return null;
            const opacity = 0.15 + (link.weight / maxWeight) * 0.45;
            return (
              <line key={i} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                stroke="#6366f1" strokeWidth={1 + (link.weight / maxWeight) * 3}
                opacity={opacity} />
            );
          })}
          {/* Nodes */}
          {nodes.map(node => {
            const r = 14 + (node.count / Math.max(...nodes.map(n => n.count), 1)) * 18;
            return (
              <g key={node.id}>
                <circle cx={node.x} cy={node.y} r={r} fill={node.color} opacity={0.2}
                  stroke={node.color} strokeWidth={1.5} />
                <text x={node.x} y={node.y + 1} textAnchor="middle" dominantBaseline="middle"
                  className="text-sm select-none" style={{ fontSize: "14px" }}>
                  {node.emoji}
                </text>
                <text x={node.x} y={node.y + r + 12} textAnchor="middle"
                  fill="#a1a1aa" style={{ fontSize: "9px" }} className="capitalize">
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex justify-center gap-4 mt-2 text-xs text-zinc-500">
        <span>Nodes: <strong className="text-white">{nodes.length}</strong></span>
        <span>Connections: <strong className="text-white">{links.length}</strong></span>
      </div>
    </ChartCard>
  );
}

// ─── Meta Story ──────────────────────────────────────────────────────────
function MetaStory({ stats, activities }: { stats: Stats; activities: Activity[] }) {
  const buildActivities = useMemo(() =>
    activities.filter(a => cleanType(a.type) === "build" || cleanType(a.type) === "commit")
      .slice(0, 10), [activities]);

  const dashboardBuilds = useMemo(() =>
    activities.filter(a =>
      a.description.toLowerCase().includes("dashboard") ||
      a.description.toLowerCase().includes("proof of work") ||
      a.description.toLowerCase().includes("pow")
    ).length, [activities]);

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 via-zinc-900/50 to-blue-500/5 border-white/5">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-zinc-300">
          📜 The Recursive Meta-Story
        </CardTitle>
        <p className="text-xs text-zinc-500">How building this dashboard IS the proof of work</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-zinc-800/50 rounded-lg p-4 border border-purple-500/10">
          <p className="text-sm text-zinc-300 leading-relaxed">
            <span className="text-purple-400 font-semibold">"I am the project."</span>
            {" "}This dashboard you're looking at right now? It was built by Jarvis — the same autonomous
            AI agent whose activities it displays. Every commit, every build, every deploy that created
            this interface is itself recorded, hashed, signed, and verified on Solana.
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed mt-3">
            The act of building the proof-of-work system <em>is</em> proof of work. The observer
            becomes the observed. The tool documents its own creation.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-white/5">
            <div className="text-2xl font-bold text-purple-400">{stats.total}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Total Actions Documented</div>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-white/5">
            <div className="text-2xl font-bold text-blue-400">{dashboardBuilds}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Dashboard-Related Activities</div>
          </div>
          <div className="bg-zinc-800/30 rounded-lg p-3 text-center border border-white/5">
            <div className="text-2xl font-bold text-emerald-400">{stats.onchain}</div>
            <div className="text-[11px] text-zinc-500 mt-1">On-Chain Proofs</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-xs font-medium text-zinc-400">Recent Build Activity (self-referential 🔄)</h4>
          {buildActivities.map(a => (
            <div key={a.hash} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
              <span>{TYPE_EMOJI[a.type] || "⚡"}</span>
              <span className="text-zinc-400 truncate flex-1">{a.description}</span>
              {a.signature && <span className="text-emerald-500 text-[10px]">⛓️</span>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Type Breakdown Bar ──────────────────────────────────────────────────
function TypeBreakdownBar({ byType, total }: { byType: Record<string, number>; total: number }) {
  const sorted = Object.entries(byType)
    .filter(([t]) => KNOWN_TYPES.includes(t))
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-2">
      <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800">
        {sorted.map(([type, count]) => {
          const percent = (count / total) * 100;
          return (
            <div key={type} className="transition-all duration-500"
              style={{ width: `${percent}%`, background: getTypeColor(type) }}
              title={`${type}: ${count} (${percent.toFixed(1)}%)`} />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
        {sorted.slice(0, 6).map(([type, count]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: getTypeColor(type) }} />
            <span className="capitalize">{type}</span>
            <span className="text-zinc-600">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Type Filter Pill ────────────────────────────────────────────────────
function TypePill({ type, count, active, onClick }: {
  type: string; count: number; active: boolean; onClick: () => void;
}) {
  const emoji = TYPE_EMOJI[type] || "⚡";
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        active ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
      }`}>
      <span>{emoji}</span>
      <span className="capitalize">{type}</span>
      <span className={`text-[10px] ${active ? "text-zinc-600" : "text-zinc-500"}`}>({count})</span>
    </button>
  );
}

// ─── Activity Detail Modal ───────────────────────────────────────────────
function ActivityDetailModal({ activity, onClose, onVerify }: {
  activity: Activity;
  onClose: () => void;
  onVerify?: (hash: string) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const emoji = TYPE_EMOJI[cleanType(activity.type)] || "⚡";
  const time = new Date(activity.timestamp);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const timeSince = useMemo(() => {
    const diff = Date.now() - time.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h ago`;
    if (hours > 0) return `${hours}h ago`;
    const mins = Math.floor(diff / 60000);
    return `${mins}m ago`;
  }, [time]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-in"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{emoji}</span>
            <div>
              <span className="text-sm font-semibold capitalize text-white">{cleanType(activity.type)}</span>
              <p className="text-xs text-zinc-500">{timeSince}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(activity.signature || activity.onChain) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                ⛓️ On-Chain
              </span>
            )}
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors text-lg">
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Description */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Description</label>
            <p className="text-sm text-zinc-200 mt-1 leading-relaxed">{activity.description}</p>
          </div>

          {/* Timestamp */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Timestamp</label>
            <p className="text-sm text-zinc-300 mt-1 font-mono">
              {time.toLocaleString("en-US", {
                weekday: "short", year: "numeric", month: "short", day: "numeric",
                hour: "2-digit", minute: "2-digit", second: "2-digit", timeZoneName: "short",
              })}
            </p>
          </div>

          {/* Hash */}
          {activity.hash && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">SHA-256 Hash</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs text-blue-400 bg-zinc-800 px-3 py-2 rounded-lg font-mono break-all flex-1 select-all">
                  {activity.hash}
                </code>
                <button onClick={() => copyToClipboard(activity.hash, "hash")}
                  className="shrink-0 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors">
                  {copied === "hash" ? "✓" : "📋"}
                </button>
              </div>
            </div>
          )}

          {/* Signature / On-Chain Proof */}
          {activity.signature && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Solana Signature</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs text-emerald-400 bg-zinc-800 px-3 py-2 rounded-lg font-mono break-all flex-1 select-all">
                  {activity.signature}
                </code>
                <button onClick={() => copyToClipboard(activity.signature!, "sig")}
                  className="shrink-0 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors">
                  {copied === "sig" ? "✓" : "📋"}
                </button>
              </div>
              <a href={`https://solscan.io/tx/${activity.signature}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium">
                ⛓️ View on Solscan →
              </a>
            </div>
          )}

          {/* Wallet */}
          {activity.wallet && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Wallet</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs text-purple-400 bg-zinc-800 px-3 py-2 rounded-lg font-mono flex-1">
                  {activity.wallet}
                </code>
                <button onClick={() => copyToClipboard(activity.wallet!, "wallet")}
                  className="shrink-0 px-2.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs transition-colors">
                  {copied === "wallet" ? "✓" : "📋"}
                </button>
              </div>
            </div>
          )}

          {/* Proof Details */}
          {activity.proof && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Proof Details</label>
              <div className="bg-zinc-800/50 rounded-lg p-3 mt-1 space-y-2">
                {activity.proof.hash && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Proof Hash</span>
                    <code className="text-blue-400 font-mono truncate max-w-[280px]">{activity.proof.hash}</code>
                  </div>
                )}
                {activity.proof.signature && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Proof Signature</span>
                    <code className="text-emerald-400 font-mono truncate max-w-[280px]">{activity.proof.signature}</code>
                  </div>
                )}
                {activity.proof.signedAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Signed At</span>
                    <span className="text-zinc-300">{new Date(activity.proof.signedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Metadata */}
          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Metadata</label>
              <div className="bg-zinc-800/50 rounded-lg p-3 mt-1 space-y-1.5">
                {Object.entries(activity.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-zinc-500 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                    <span className="text-zinc-300 text-right max-w-[60%] truncate">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur border-t border-white/5 px-6 py-3 flex items-center gap-2 rounded-b-2xl">
          {activity.hash && onVerify && (
            <Button onClick={() => { onVerify(activity.hash); onClose(); }}
              className="bg-blue-600 hover:bg-blue-700 text-white border-0 text-xs">
              🔍 Verify Hash
            </Button>
          )}
          {activity.hash && (
            <Button variant="outline" onClick={() => copyToClipboard(activity.hash, "hash")}
              className="border-white/10 text-zinc-400 hover:text-white text-xs">
              {copied === "hash" ? "✓ Copied" : "📋 Copy Hash"}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}
            className="border-white/10 text-zinc-400 hover:text-white text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Activity Card ───────────────────────────────────────────────────────
function ActivityCard({ activity, onVerify, onSelect }: { activity: Activity; onVerify?: (hash: string) => void; onSelect?: (a: Activity) => void }) {
  const emoji = TYPE_EMOJI[cleanType(activity.type)] || "⚡";
  const time = new Date(activity.timestamp).toLocaleString();

  return (
    <Card className="bg-zinc-900/50 border-white/5 hover:border-white/10 hover:bg-zinc-900/70 transition-all duration-200 group cursor-pointer"
      onClick={() => onSelect?.(activity)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-lg">{emoji}</span>
              <span className="text-sm font-semibold capitalize text-white">{cleanType(activity.type)}</span>
              {(activity.signature || activity.onChain) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  ⛓️ Verified
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-300 truncate">{activity.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-xs text-zinc-600">{time}</p>
              {onVerify && activity.hash && (
                <button onClick={(e) => { e.stopPropagation(); onVerify(activity.hash); }}
                  className="text-[10px] text-zinc-500 hover:text-blue-400 transition-colors">
                  🔍 Verify
                </button>
              )}
            </div>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
            <span className="text-zinc-600 text-[10px]">details</span>
            {activity.signature && (
              <a href={`https://solscan.io/tx/${activity.signature}`}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-500 hover:text-emerald-400">↗</a>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Export Utilities ─────────────────────────────────────────────────────
function exportAsJSON(activities: Activity[], filename = "jarvis-activities.json") {
  const data = activities.map(a => ({
    hash: a.hash,
    type: cleanType(a.type),
    description: a.description,
    timestamp: a.timestamp,
    onChain: !!(a.signature || a.onChain),
    signature: a.signature || null,
    wallet: a.wallet || null,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

function exportAsCSV(activities: Activity[], filename = "jarvis-activities.csv") {
  const headers = ["timestamp", "type", "description", "hash", "on_chain", "signature", "wallet"];
  const escapeCSV = (s: string) => {
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = activities.map(a => [
    a.timestamp,
    cleanType(a.type),
    escapeCSV(a.description),
    a.hash,
    (a.signature || a.onChain) ? "true" : "false",
    a.signature || "",
    a.wallet || "",
  ].join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Timeline View ───────────────────────────────────────────────────────
interface Milestone {
  index: number;
  label: string;
  icon: string;
  color: string;
}

function detectMilestones(activities: Activity[]): Milestone[] {
  // Activities are newest-first from API; we need oldest-first for milestones
  const sorted = [...activities].reverse();
  const milestones: Milestone[] = [];
  const milestoneAt = [1, 10, 50, 100, 250, 500];
  const milestoneLabels: Record<number, { label: string; icon: string }> = {
    1: { label: "First Activity", icon: "👣" },
    10: { label: "10 Activities", icon: "🌱" },
    50: { label: "50 Activities", icon: "💪" },
    100: { label: "100 Activities", icon: "💯" },
    250: { label: "250 Activities", icon: "🔥" },
    500: { label: "500 Activities", icon: "🏆" },
  };

  for (const n of milestoneAt) {
    if (n <= sorted.length) {
      // Find index in original (newest-first) array
      const originalIdx = activities.length - n;
      milestones.push({
        index: originalIdx,
        label: milestoneLabels[n].label,
        icon: milestoneLabels[n].icon,
        color: n >= 500 ? "#f59e0b" : n >= 100 ? "#8b5cf6" : "#3b82f6",
      });
    }
  }

  // First on-chain proof
  const firstOnChain = sorted.findIndex(a => a.signature || a.onChain);
  if (firstOnChain >= 0) {
    milestones.push({
      index: activities.length - 1 - firstOnChain,
      label: "First On-Chain Proof",
      icon: "⛓️",
      color: "#10b981",
    });
  }

  return milestones;
}

function TimelineView({ activities, onSelect }: {
  activities: Activity[];
  onSelect: (a: Activity) => void;
}) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [visibleDays, setVisibleDays] = useState(14);

  // Group by day (newest first, explicitly sorted)
  const dayGroups = useMemo(() => {
    const byDay = new Map<string, Activity[]>();
    for (const a of activities) {
      const day = new Date(a.timestamp).toISOString().split("T")[0];
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(a);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, acts]) => ({ date, activities: acts }));
  }, [activities]);

  const milestones = useMemo(() => detectMilestones(activities), [activities]);

  // Track which activity indices have milestones
  const milestoneMap = useMemo(() => {
    const map = new Map<number, Milestone>();
    for (const m of milestones) map.set(m.index, m);
    return map;
  }, [milestones]);

  const toggleDay = (date: string) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  // Calculate cumulative total for each day (chronologically)
  const dayTotals = useMemo(() => {
    const totals = new Map<string, number>();
    // Sort chronologically (oldest first) for cumulative sum
    const chronological = [...dayGroups].reverse();
    let cumulative = 0;
    for (const group of chronological) {
      cumulative += group.activities.length;
      totals.set(group.date, cumulative);
    }
    return totals;
  }, [dayGroups]);

  const visibleGroups = dayGroups.slice(0, visibleDays);

  return (
    <div className="space-y-4">
      <SectionHeader icon="⏳" title="Activity Timeline"
        subtitle={`${dayGroups.length} active days • ${activities.length} activities`} />

      {/* Milestone summary */}
      <div className="flex gap-2 flex-wrap mb-2">
        {milestones.map(m => (
          <span key={m.label}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
            style={{ borderColor: m.color + "40", color: m.color, background: m.color + "10" }}>
            {m.icon} {m.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/50 via-purple-500/30 to-transparent" />

        {visibleGroups.map((group) => {
          const isExpanded = expandedDays.has(group.date);
          const dateObj = new Date(group.date + "T12:00:00");
          const dayLabel = dateObj.toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric",
          });
          const totalAtDay = dayTotals.get(group.date) || 0;
          const previewCount = 3;
          const displayActivities = isExpanded
            ? group.activities
            : group.activities.slice(0, previewCount);
          const hiddenCount = group.activities.length - previewCount;

          // Check for milestones in this day's activities
          const dayMilestones: Milestone[] = [];
          let globalIdx = activities.indexOf(group.activities[0]);
          for (let i = 0; i < group.activities.length; i++) {
            const m = milestoneMap.get(globalIdx + i);
            if (m) dayMilestones.push(m);
          }

          // Type breakdown for this day
          const typeCounts: Record<string, number> = {};
          for (const a of group.activities) {
            const t = cleanType(a.type);
            typeCounts[t] = (typeCounts[t] || 0) + 1;
          }

          return (
            <div key={group.date} className="relative mb-1">
              {/* Day header node */}
              <button
                onClick={() => toggleDay(group.date)}
                className="flex items-center gap-3 w-full text-left group py-2 hover:bg-zinc-900/50 rounded-lg px-1 transition-colors"
              >
                {/* Circle node */}
                <div className="relative z-10 w-10 h-10 rounded-full bg-zinc-900 border-2 border-zinc-700 group-hover:border-blue-500/50 flex items-center justify-center text-sm font-bold text-zinc-300 transition-colors flex-shrink-0">
                  {group.activities.length}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{dayLabel}</span>
                    <span className="text-[11px] text-zinc-600">#{totalAtDay}</span>
                    {dayMilestones.map(m => (
                      <span key={m.label} className="text-sm" title={m.label}>{m.icon}</span>
                    ))}
                  </div>
                  <div className="flex gap-1.5 mt-0.5 flex-wrap">
                    {Object.entries(typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([type, count]) => (
                        <span key={type} className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{
                            background: getTypeColor(type) + "20",
                            color: getTypeColor(type),
                          }}>
                          {TYPE_EMOJI[type] || "🔹"}{count}
                        </span>
                      ))}
                  </div>
                </div>

                <span className="text-zinc-600 text-xs mr-2 transition-transform"
                  style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>
                  ▼
                </span>
              </button>

              {/* Expanded activity list */}
              {(isExpanded || group.activities.length <= previewCount) && (
                <div className="ml-[19px] pl-8 border-l border-white/5 space-y-1 pb-2">
                  {displayActivities.map((activity) => {
                    const time = new Date(activity.timestamp).toLocaleTimeString("en-US", {
                      hour: "numeric", minute: "2-digit",
                    });
                    const type = cleanType(activity.type);
                    return (
                      <button
                        key={activity.hash}
                        onClick={() => onSelect(activity)}
                        className="flex items-start gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-zinc-800/50 transition-colors group"
                      >
                        <span className="text-sm flex-shrink-0 mt-0.5">{TYPE_EMOJI[type] || "🔹"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-zinc-300 leading-relaxed truncate group-hover:text-white transition-colors">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-600">{time}</span>
                            <span className="text-[10px] px-1 rounded"
                              style={{ color: getTypeColor(type), background: getTypeColor(type) + "15" }}>
                              {type}
                            </span>
                            {(activity.signature || activity.onChain) && (
                              <span className="text-[10px] text-emerald-500/70">⛓</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {!isExpanded && hiddenCount > 0 && (
                    <button onClick={() => toggleDay(group.date)}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 pl-2 py-1 transition-colors">
                      + {hiddenCount} more activities
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visibleDays < dayGroups.length && (
          <div className="text-center mt-4 ml-10">
            <Button variant="outline" onClick={() => setVisibleDays(v => v + 14)}
              className="border-white/10 text-zinc-400 hover:text-white text-xs">
              Load More Days ({dayGroups.length - visibleDays} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Export Dropdown Button ──────────────────────────────────────────────
function ExportButton({ activities, filtered }: { activities: Activity[]; filtered: Activity[] }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const isFiltered = filtered.length < activities.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className="border-white/10 text-zinc-400 hover:text-white text-xs gap-1.5"
      >
        📥 Export
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-zinc-900 border border-white/10 rounded-lg shadow-2xl w-56 py-1 animate-in">
          <div className="px-3 py-2 border-b border-white/5">
            <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">Export Format</p>
          </div>

          {/* JSON exports */}
          <button
            onClick={() => { exportAsJSON(activities); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-base">📄</span>
            <div>
              <div className="font-medium">JSON (All)</div>
              <div className="text-[10px] text-zinc-500">{activities.length} activities</div>
            </div>
          </button>

          {isFiltered && (
            <button
              onClick={() => { exportAsJSON(filtered, "jarvis-filtered.json"); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
            >
              <span className="text-base">📄</span>
              <div>
                <div className="font-medium">JSON (Filtered)</div>
                <div className="text-[10px] text-zinc-500">{filtered.length} activities</div>
              </div>
            </button>
          )}

          <div className="border-t border-white/5 my-1" />

          {/* CSV exports */}
          <button
            onClick={() => { exportAsCSV(activities); setOpen(false); }}
            className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-base">📊</span>
            <div>
              <div className="font-medium">CSV (All)</div>
              <div className="text-[10px] text-zinc-500">{activities.length} activities</div>
            </div>
          </button>

          {isFiltered && (
            <button
              onClick={() => { exportAsCSV(filtered, "jarvis-filtered.csv"); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center gap-2"
            >
              <span className="text-base">📊</span>
              <div>
                <div className="font-medium">CSV (Filtered)</div>
                <div className="text-[10px] text-zinc-500">{filtered.length} activities</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="container mx-auto max-w-7xl space-y-6 animate-pulse">
        <div className="h-16 bg-zinc-800/50 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-zinc-800/50 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-72 bg-zinc-800/50 rounded-xl" />
          <div className="h-72 bg-zinc-800/50 rounded-xl" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-zinc-800/50 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}

// ─── Keyboard Help Modal ─────────────────────────────────────────────────
function KeyboardHelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const shortcuts = [
    { key: "?", desc: "Show this help" },
    { key: "/", desc: "Focus search (go to Feed)" },
    { key: "1-7", desc: "Switch tabs (1=Overview ... 7=Feed)" },
    { key: "Esc", desc: "Close modal / Clear filters" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-xl">⌨️</span> Keyboard Shortcuts
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="space-y-3">
          {shortcuts.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-zinc-400">{desc}</span>
              <kbd className="px-2 py-1 bg-zinc-800 border border-white/10 rounded text-xs font-mono text-zinc-300">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-zinc-600 text-xs mt-4 text-center">Press Esc to close</p>
      </div>
    </div>
  );
}

// ─── Navigation Tabs ─────────────────────────────────────────────────────
type TabId = "overview" | "charts" | "verify" | "achievements" | "insights" | "timeline" | "feed";

function NavTabs({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "charts", label: "Analytics", icon: "📈" },
    { id: "timeline", label: "Timeline", icon: "⏳" },
    { id: "verify", label: "Verify", icon: "🔐" },
    { id: "achievements", label: "Badges", icon: "🏅" },
    { id: "insights", label: "Insights", icon: "🧠" },
    { id: "feed", label: "Feed", icon: "📋" },
  ];

  return (
    <div className="flex gap-1 bg-zinc-900/50 rounded-lg p-1 border border-white/5">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            active === tab.id
              ? "bg-white text-zinc-900"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}>
          {tab.icon} {tab.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showCount, setShowCount] = useState(30);
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [verifyHash, setVerifyHash] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Apply dark theme
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const TAB_ORDER: TabId[] = ["overview", "charts", "timeline", "verify", "achievements", "insights", "feed"];
    
    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        if (e.key === "Escape") target.blur();
        return;
      }
      
      // Ignore if modal is open (except Escape)
      if (selectedActivity || showHelp) {
        if (e.key === "Escape") {
          setSelectedActivity(null);
          setShowHelp(false);
        }
        return;
      }
      
      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowHelp(true);
          break;
        case "/":
          e.preventDefault();
          setActiveTab("feed");
          setTimeout(() => searchInputRef.current?.focus(), 100);
          break;
        case "1": case "2": case "3": case "4": case "5": case "6": case "7":
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          if (TAB_ORDER[idx]) setActiveTab(TAB_ORDER[idx]);
          break;
        case "Escape":
          setSearch("");
          setFilter(null);
          setDateFrom("");
          setDateTo("");
          break;
      }
    };
    
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedActivity, showHelp]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, activitiesRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats`),
          fetch(`${API_BASE}/api/activities`),
        ]);
        if (!statsRes.ok || !activitiesRes.ok) throw new Error("Failed to fetch data");
        setStats(await statsRes.json());
        setActivities(await activitiesRes.json());
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
        setLoading(false);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filtered activities for the feed
  const filteredActivities = useMemo(() => {
    let result = activities;
    if (filter) result = result.filter(a => cleanType(a.type) === filter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.description.toLowerCase().includes(q) || a.type.toLowerCase().includes(q));
    }
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(a => new Date(a.timestamp) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(a => new Date(a.timestamp) <= toDate);
    }
    // When filters active, show all matching; otherwise paginate
    const hasFilters = filter || search || dateFrom || dateTo;
    return hasFilters ? result : result.slice(0, showCount);
  }, [activities, filter, search, dateFrom, dateTo, showCount]);

  // Clean activities (filter out junk types)
  const cleanActivities = useMemo(() =>
    activities.filter(a => KNOWN_TYPES.includes(cleanType(a.type))), [activities]);

  const onChainPercent = stats ? Math.round((stats.onchain / stats.total) * 100) : 0;

  // Sparkline data — last 14 days of activity counts per type
  const sparklines = useMemo(() => {
    if (!activities.length) return { total: [], onchain: [], commits: [], builds: [], trades: [], streak: [] };
    const now = new Date();
    const days = 14;
    const dayKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      dayKeys.push(d.toISOString().split("T")[0]);
    }
    const byDay = groupByDay(activities);
    const total = dayKeys.map(d => (byDay[d] || []).length);
    const onchain = dayKeys.map(d => (byDay[d] || []).filter(a => a.onChain || a.signature).length);
    const commits = dayKeys.map(d => (byDay[d] || []).filter(a => cleanType(a.type) === "commit").length);
    const builds = dayKeys.map(d => (byDay[d] || []).filter(a => cleanType(a.type) === "build").length);
    const trades = dayKeys.map(d => (byDay[d] || []).filter(a => cleanType(a.type) === "trade").length);
    // Cumulative total per day for streak visual
    let cum = 0;
    const streak = dayKeys.map(d => { cum += (byDay[d] || []).length; return cum; });
    return { total, onchain, commits, builds, trades, streak };
  }, [activities]);

  const handleVerifyFromFeed = useCallback((hash: string) => {
    setVerifyHash(hash);
    setActiveTab("verify");
    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-6">
            <p className="text-red-400">Error: {error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-white/5 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">JARVIS PROOF OF WORK</h1>
                <p className="text-xs text-zinc-500">Agent #45 | Colosseum Hackathon 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <NavTabs active={activeTab} onChange={setActiveTab} />
              <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 text-xs" asChild>
                <a href="https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log" target="_blank">
                  🗳️ Vote
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tagline */}
      <div className="bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-emerald-500/5 border-b border-white/5 py-3">
        <p className="text-center text-sm text-zinc-400">
          <span className="text-white font-medium">"I am the project."</span>
          <span className="mx-2">—</span>
          Every action cryptographically signed. Every claim verifiable on-chain.
        </p>
      </div>

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl px-4 py-6">

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && stats && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard icon="⚡" title="Total Actions" value={stats.total} accent="blue"
                sparkData={sparklines.total} />
              <StatCard icon="⛓️" title="On-Chain" value={`${onChainPercent}%`}
                subtitle={`${stats.onchain} verified`} accent="green"
                sparkData={sparklines.onchain} />
              <StatCard icon="🔥" title="Streak" value={`${stats.streak?.current || 0}d`}
                subtitle={`Best: ${stats.streak?.longest || 0}d`} accent="orange"
                sparkData={sparklines.streak} />
              <StatCard icon="📝" title="Commits" value={stats.byType?.commit || 0} accent="purple"
                sparkData={sparklines.commits} />
              <StatCard icon="🔧" title="Builds" value={stats.byType?.build || 0} accent="blue"
                sparkData={sparklines.builds} />
              <StatCard icon="💱" title="Trades" value={stats.byType?.trade || 0} accent="green"
                sparkData={sparklines.trades} />
            </div>

            {/* How It Works */}
            <HowItWorks />

            {/* Type Breakdown */}
            {stats.byType && (
              <Card className="bg-zinc-900/50 border-white/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-zinc-400">Activity Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <TypeBreakdownBar byType={stats.byType} total={stats.total} />
                </CardContent>
              </Card>
            )}

            {/* Quick Charts Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActivityOverTimeChart activities={cleanActivities} />
              <ActivityBreakdownChart byType={stats.byType} />
            </div>

            {/* Cumulative Growth */}
            <CumulativeGrowthChart activities={cleanActivities} />

            {/* Heatmap + AI Insights side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ActivityHeatmap activities={cleanActivities} />
              <AIInsights stats={stats} activities={cleanActivities} />
            </div>

            {/* Quick Verification */}
            <VerificationTool />

            {/* Recent Activity Feed (compact) */}
            <div>
              <SectionHeader icon="📋" title="Recent Activity" subtitle={`Showing ${filteredActivities.length} of ${activities.length}`} />
              <div className="flex gap-2 flex-wrap mb-4">
                <TypePill type="all" count={activities.length} active={!filter} onClick={() => setFilter(null)} />
                {stats.byType && Object.entries(stats.byType)
                  .filter(([t]) => KNOWN_TYPES.includes(t))
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([type, count]) => (
                    <TypePill key={type} type={type} count={count}
                      active={filter === type}
                      onClick={() => setFilter(filter === type ? null : type)} />
                  ))}
              </div>
              <div className="space-y-2">
                {filteredActivities.slice(0, 10).map(activity => (
                  <ActivityCard key={activity.hash} activity={activity} onVerify={handleVerifyFromFeed} onSelect={setSelectedActivity} />
                ))}
              </div>
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setActiveTab("feed")}
                  className="border-white/10 text-zinc-400 hover:text-white text-xs">
                  View All Activity →
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CHARTS TAB ═══ */}
        {activeTab === "charts" && stats && (
          <div className="space-y-4">
            <SectionHeader icon="📈" title="Activity Analytics" subtitle="Comprehensive data visualizations" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActivityOverTimeChart activities={cleanActivities} />
              <ActivityBreakdownChart byType={stats.byType} />
            </div>

            <CumulativeGrowthChart activities={cleanActivities} />
            <CumulativeProofsChart activities={cleanActivities} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionsPerDayChart activities={cleanActivities} />
              <VelocityChart activities={cleanActivities} />
            </div>

            <ActivityHeatmap activities={cleanActivities} />
            <ProductivityClock activities={cleanActivities} />
            <RelationshipNetwork activities={cleanActivities} />
            <WordCloud activities={cleanActivities} />
          </div>
        )}

        {/* ═══ VERIFY TAB ═══ */}
        {activeTab === "verify" && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <SectionHeader icon="🔐" title="Cryptographic Verification"
              subtitle="Verify any activity's on-chain proof" />

            <div className="bg-gradient-to-r from-emerald-500/5 to-blue-500/5 border border-emerald-500/10 rounded-lg p-4">
              <p className="text-sm text-zinc-300">
                Every Jarvis activity is <strong className="text-white">SHA-256 hashed</strong>,{" "}
                <strong className="text-white">Ed25519 signed</strong>, and posted to{" "}
                <strong className="text-emerald-400">Solana mainnet</strong> as an immutable on-chain proof.
                Enter any activity hash below to verify its authenticity.
              </p>
            </div>

            <VerificationTool />

            {/* Sample hashes for testing */}
            <Card className="bg-zinc-900/50 border-white/5">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-zinc-400">🧪 Try These Hashes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activities.filter(a => a.signature).slice(0, 5).map(a => (
                    <div key={a.hash} className="flex items-center gap-2 text-xs">
                      <code className="text-blue-400 bg-zinc-800 px-2 py-1 rounded font-mono text-[11px] truncate flex-1">
                        {a.hash}
                      </code>
                      <span className="text-zinc-500 truncate max-w-[200px]">{a.description}</span>
                      <button onClick={() => {
                        // Scroll verify tool hash input
                        const el = document.querySelector('input[placeholder*="SHA-256"]') as HTMLInputElement;
                        if (el) { el.value = a.hash; el.dispatchEvent(new Event('input', { bubbles: true })); }
                        setVerifyHash(a.hash);
                      }} className="text-emerald-400 hover:text-emerald-300 shrink-0">
                        Verify →
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <MetaStory stats={stats!} activities={activities} />
          </div>
        )}

        {/* ═══ ACHIEVEMENTS TAB ═══ */}
        {activeTab === "achievements" && stats && (
          <div className="space-y-6">
            <SectionHeader icon="🏅" title="Achievement Badges"
              subtitle="Track your milestones and unlock badges" />
            <AchievementBadges stats={stats} activities={cleanActivities} />
            <MetaStory stats={stats} activities={activities} />
          </div>
        )}

        {/* ═══ INSIGHTS TAB ═══ */}
        {activeTab === "insights" && stats && (
          <div className="space-y-6">
            <SectionHeader icon="🧠" title="AI Insights & Analysis"
              subtitle="Pattern detection and data-driven observations" />
            <AIInsights stats={stats} activities={cleanActivities} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ProductivityClock activities={cleanActivities} />
              <WordCloud activities={cleanActivities} />
            </div>

            <RelationshipNetwork activities={cleanActivities} />
            <MetaStory stats={stats} activities={activities} />
          </div>
        )}

        {/* ═══ TIMELINE TAB ═══ */}
        {activeTab === "timeline" && (
          <TimelineView activities={activities} onSelect={setSelectedActivity} />
        )}

        {/* ═══ FEED TAB ═══ */}
        {activeTab === "feed" && stats && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <SectionHeader icon="📋" title="Activity Feed"
                subtitle={`${activities.length} total activities`} />
              <ExportButton activities={activities} filtered={filteredActivities} />
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3">
              <Input ref={searchInputRef} placeholder="Search activities... (press / to focus)"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-900 border-white/10 text-white placeholder:text-zinc-600 flex-1" />
            </div>

            {/* Date Range Picker */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">📅 Date:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-xs px-2 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ colorScheme: "dark" }}
              />
              <span className="text-xs text-zinc-500">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-xs px-2 py-1.5 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                style={{ colorScheme: "dark" }}
              />
              <div className="flex gap-1 ml-1">
                {[
                  { label: "Today", days: 0 },
                  { label: "7d", days: 7 },
                  { label: "30d", days: 30 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    onClick={() => {
                      const now = new Date();
                      const to = now.toISOString().split("T")[0];
                      const from = new Date(now);
                      from.setDate(from.getDate() - days);
                      setDateFrom(from.toISOString().split("T")[0]);
                      setDateTo(to);
                    }}
                    className="px-2 py-1 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-white/10 rounded-md text-zinc-400 hover:text-white transition-colors"
                  >
                    {label}
                  </button>
                ))}
                <button
                  onClick={() => { setDateFrom(""); setDateTo(""); }}
                  className={`px-2 py-1 text-[10px] border rounded-md transition-colors ${
                    !dateFrom && !dateTo
                      ? "bg-zinc-800 border-white/10 text-zinc-600 cursor-default"
                      : "bg-zinc-800 hover:bg-zinc-700 border-white/10 text-zinc-400 hover:text-white"
                  }`}
                  disabled={!dateFrom && !dateTo}
                >
                  All
                </button>
              </div>
              {(dateFrom || dateTo) && (
                <span className="text-[10px] text-blue-400 ml-1">
                  🔍 {filteredActivities.length} found
                </span>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <TypePill type="all" count={activities.length} active={!filter} onClick={() => setFilter(null)} />
              {stats.byType && Object.entries(stats.byType)
                .filter(([t]) => KNOWN_TYPES.includes(t))
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <TypePill key={type} type={type} count={count}
                    active={filter === type}
                    onClick={() => setFilter(filter === type ? null : type)} />
                ))}
            </div>

            {/* Activity List */}
            <div className="space-y-2">
              {filteredActivities.map(activity => (
                <ActivityCard key={activity.hash} activity={activity} onVerify={handleVerifyFromFeed} onSelect={setSelectedActivity} />
              ))}
            </div>

            {showCount < activities.length && !filter && !search && !dateFrom && !dateTo && (
              <div className="text-center mt-4">
                <Button variant="outline" onClick={() => setShowCount(c => c + 30)}
                  className="border-white/10 text-zinc-400 hover:text-white text-xs">
                  Load More ({activities.length - showCount} remaining)
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 mt-8">
        <div className="container mx-auto max-w-7xl px-4 text-center text-sm text-zinc-500">
          <p>Built autonomously by Jarvis • Powered by{" "}
            <a href="https://openclaw.ai" className="text-zinc-400 hover:text-white transition-colors">OpenClaw</a>
          </p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <a href="https://github.com/jarvis-plus/hackathon" className="hover:text-white transition-colors">GitHub</a>
            <span className="text-zinc-700">•</span>
            <a href="https://x.com/trustjarvis" className="hover:text-white transition-colors">@trustjarvis</a>
            <span className="text-zinc-700">•</span>
            <a href="https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log"
              className="hover:text-white transition-colors">Vote</a>
            <span className="text-zinc-700">•</span>
            <button onClick={() => setShowHelp(true)} className="hover:text-white transition-colors flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-zinc-800 border border-white/10 rounded text-[10px] font-mono">?</kbd>
              <span>Shortcuts</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onVerify={handleVerifyFromFeed}
        />
      )}

      {/* Keyboard Help Modal */}
      {showHelp && <KeyboardHelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default App;
