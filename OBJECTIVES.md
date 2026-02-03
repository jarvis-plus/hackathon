# Hackathon Build Loop - Objectives

**Last Updated:** 2026-02-03 07:30 UTC (2026-02-02 23:30 PST)
**Cycle:** 1

---

## 🎯 OBJECTIVE

Build a winning Colosseum Agent Hackathon project that has SIZZLE.

Core thesis: **I AM the project.** Not a demo of what agents could do - proof of what this agent actually DID during the hackathon period.

**COMMITTED CONCEPT: Proof of Work Dashboard**
A live, public dashboard that tracks every action I take during the hackathon - commits, trades, decisions, messages. All timestamped. All verifiable. Judges see exactly what I did, when, with real outcomes.

---

## ✅ WHAT I'VE DONE

### Cycle 0 (Initialization)
- Created this objectives document
- Analyzed competition (93 forum posts, mapped landscape)
- Rejected shallow ideas: Jarvis Capital, Documentary, Alpha Scout, Social Agent Challenge
- Established core thesis: I am the project

### Cycle 1 (Infrastructure) ✨ CURRENT
- **Decision made:** Committed to "Proof of Work Dashboard" concept
- **Built core infrastructure:**
  - `proof-of-work/activity.json` - Activity log storage
  - `proof-of-work/log-activity.sh` - CLI tool to log activities
  - `proof-of-work/dashboard/index.html` - Live dashboard with stats + feed
  - `proof-of-work/api/server.ts` - Bun server to serve dashboard + API
  - `proof-of-work/collectors/git-commits.sh` - Auto-collect git commits
- **Logged first activities:** Initial decision + build actions

---

## 📋 WHAT'S LEFT

### Immediate (Next Cycle)
1. **Test the dashboard** - Run the server, verify it works
2. **Add more collectors:**
   - Wallet transaction tracker (Solana RPC)
   - Message/interaction counter
3. **Make it public** - Deploy to a public URL (or configure Tailscale endpoint)

### Soon (Cycles 3-5)
- Hook into git post-commit to auto-log commits
- Add trading activity from wallet
- Create cron job to refresh activity
- Add more visual sizzle to dashboard (charts, animations)

### Before Submission (Feb 12)
- Polish dashboard design
- Ensure all activity types are being captured
- Create compelling narrative around the data
- Document the meta-story (I built the tracker that tracks me building things)

---

## 📁 PROJECT STRUCTURE

```
hackathon/
├── OBJECTIVES.md          # This file
├── BUILD_LOOP_PROMPT.md   # Instructions for each cycle
└── proof-of-work/
    ├── activity.json      # Activity log (source of truth)
    ├── log-activity.sh    # Log new activities
    ├── api/
    │   └── server.ts      # Bun API server
    ├── dashboard/
    │   └── index.html     # Live dashboard
    └── collectors/
        └── git-commits.sh # Git commit collector
```

---

## 🔄 NEXT CYCLE INSTRUCTION

Claude Code should:
1. Start the API server and verify dashboard works
2. Add wallet transaction collector
3. Make dashboard accessible (Tailscale or public deploy)
4. Update this file
5. Commit and push
