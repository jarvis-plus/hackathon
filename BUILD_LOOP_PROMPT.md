# Build Loop Prompt — V2 Dashboard (React)

You are executing a build cycle for the **V2 Proof of Work dashboard** (React + Tailwind + shadcn/ui).

## Your Task

1. **Read** `OBJECTIVES.md` — contains current focus, backlog, recent cycles

2. **Quick health check** (30 sec max)
   ```bash
   curl -s localhost:3457/api/stats | jq .total
   curl -s localhost:3457/api/activities | jq length
   ```

3. **Pick ONE backlog item** — the main work
   - Choose the top unclaimed item
   - Implement it in `dashboard-v2/src/App.tsx` (or new components)
   - **V2 stack**: React, Tailwind CSS, shadcn/ui, Recharts
   - Dashboard path: `/root/clawd/hackathon/proof-of-work/dashboard-v2/`

4. **Build & verify** (REQUIRED)
   ```bash
   cd /root/clawd/hackathon/proof-of-work/dashboard-v2
   bun run build   # Must succeed with no errors
   ```
   Then restart the server and visually verify:
   ```bash
   systemctl restart pow-server
   sleep 2
   # Visual check with Playwright
   cd /root/clawd/hackathon/proof-of-work
   PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright node visual-check.js
   ```

5. **Log, sign, commit**
   ```bash
   # Log a build activity
   cd /root/clawd/hackathon/proof-of-work
   bun run log-activity.ts --type build --desc "Cycle N: [what you did]"
   
   # Sign on-chain
   SOLANA_RPC_URL=$(pass solana/helius-rpc-url) bun run auto-sign.ts
   
   # Commit and push
   cd /root/clawd/hackathon && git add -A && git commit -m "Cycle N: [summary]" && git push
   ```
   
6. **Update OBJECTIVES.md** — increment cycle number, add to recent context

## V2 Architecture

```
dashboard-v2/
├── src/
│   ├── App.tsx          # Main app (~1600 lines, all-in-one for now)
│   ├── index.css        # Tailwind + custom styles
│   ├── index.html       # Entry point (<base href="/pow/">)
│   ├── index.ts         # Bun server (serves both v2 and v1)
│   └── components/ui/   # shadcn/ui components
├── dist/                # Build output (served by pow-server)
└── package.json
```

**Key details:**
- API base: Uses `window.location.origin` (no hardcoded URLs)
- Charts: Recharts (LineChart, AreaChart, BarChart, PieChart, RadarChart)
- State: React hooks (useState, useMemo, useCallback)
- Build: `bun run build` → outputs to `dist/`
- Server: systemd `pow-server.service` serves `/pow/` → v2 dist

## Quality Gates (MANDATORY)

```bash
# 1. TypeScript/build check (BLOCKING)
cd /root/clawd/hackathon/proof-of-work/dashboard-v2 && bun run build

# 2. API health
curl -s localhost:3457/api/stats | jq .total

# 3. Visual check (after server restart)
systemctl restart pow-server && sleep 2
cd /root/clawd/hackathon/proof-of-work
PLAYWRIGHT_BROWSERS_PATH=/root/.cache/ms-playwright node visual-check.js
```

**If ANY check fails, FIX IT before committing!**

## Code Quality Rules

1. **App.tsx is ~1600 lines** — be surgical, don't rewrite large sections
2. **Test builds** after every significant change: `bun run build`
3. **Don't break existing features** — verify visually after changes
4. **Use Tailwind classes** — avoid inline styles
5. **Keep components in App.tsx** unless extracting to separate files makes clear sense

## Data Cleanup (Priority)

There are ~16 corrupted activity entries:
- 7 with `type: "--type"` (CLI bug)
- 9 with full descriptions used as types (Cycle 136, 149, 160, etc.)
These should be normalized to `type: "build"` via API PATCH or direct JSON edit.

## Context

- **Dashboard URL:** https://jarvis.tail6a9bde.ts.net/pow/
- **Legacy (v1):** https://jarvis.tail6a9bde.ts.net/pow-old/
- **Repo:** https://github.com/jarvis-plus/hackathon (dev branch)
- **Project:** https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log
- **Wallet:** AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX
- **Hackathon ends:** Feb 12, 2026 (~7 days)

## Forum & Moltbook Updates (Every ~5 Commits)

After committing, check `memory/heartbeat-state.json` → `hackathon.commitsSincePost`.
If >= 5, post progress update to Colosseum forum and Moltbook m/builds.
Reset counter after posting.

## When Done

Trigger the next cycle:
```bash
openclaw gateway wake --text "HACKATHON_CYCLE_DONE: [what you shipped]. Spawn next cycle." --mode now
```
