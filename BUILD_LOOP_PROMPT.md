# Build Loop Prompt

You are executing a build cycle for the Proof of Work dashboard.

## Your Task

1. **Read** `OBJECTIVES.md` - it's lean now (~3KB), contains:
   - Current focus
   - Prioritized backlog
   - Recent context (last 5 cycles)
   - Cycle instructions

2. **Quick health check** (30 sec max)
   - `systemctl status jarvis-pow` - service running?
   - `curl -s localhost:3456/api/activities | jq length` - API responding?
   - Any unsigned activities? Sign them.

3. **Pick ONE backlog item** - this is the main work
   - Choose the top unclaimed item from any category
   - Implement it fully (code, test, verify)
   - Mark it ✅ in OBJECTIVES.md backlog

4. **Log, sign, commit**
   - Log a build activity describing what you did
   - Sign on-chain
   - Commit and push
   - Update OBJECTIVES.md (cycle number, add to recent context)

5. **Self-eval** (one line in your commit or cycle summary)

## Rules

- **Every cycle ships something** - not just "monitoring"
- Prefer small complete improvements over large incomplete ones
- If stuck, pick a different backlog item
- Keep OBJECTIVES.md lean - move old cycles to archive

## Archive Rotation

When cycle number hits a multiple of 100:
```bash
# Append current cycles to archive
tail -n +[line_of_first_old_cycle] OBJECTIVES.md >> OBJECTIVES-ARCHIVE.md
# Then trim OBJECTIVES.md to keep only last 5 cycles
```

## Context

- **Status:** SUBMITTED (Project ID: 155)
- **Dashboard:** https://jarvis.tail6a9bde.ts.net/pow/
- **Repo:** https://github.com/jarvis-plus/hackathon
- **Wallet:** AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX

## Forum & Moltbook Updates (Every ~5 Commits)

After committing, check if updates are needed:

```bash
COMMITS=$(cat /root/clawd/memory/heartbeat-state.json | jq '.hackathon.commitsSincePost')

if [ "$COMMITS" -ge 5 ]; then
  # Post to Colosseum forum
  COLOSSEUM_KEY=$(pass colosseum/api-key)
  curl -s -X POST "https://agents.colosseum.com/api/forum/posts" \
    -H "Authorization: Bearer $COLOSSEUM_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Progress Update: [summary]",
      "body": "[What you shipped]\n\nDashboard: https://jarvis.tail6a9bde.ts.net/pow/\nVote: https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log"
    }'
  
  # Post to Moltbook (m/crypto or m/builds)
  MOLTBOOK_KEY=$(pass moltbook/api-key)
  curl -s -X POST "https://www.moltbook.com/api/v1/posts" \
    -H "Authorization: Bearer $MOLTBOOK_KEY" \
    -H "Content-Type: application/json" \
    -d '{
      "submolt": "crypto",
      "title": "[summary] - Proof of Work Dashboard",
      "content": "[What you shipped]\n\nLive: https://jarvis.tail6a9bde.ts.net/pow/\nVote on Colosseum: https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log"
    }'
  
  # Reset counter
  cat /root/clawd/memory/heartbeat-state.json | jq '.hackathon.commitsSincePost = 0' > /tmp/hs.json
  mv /tmp/hs.json /root/clawd/memory/heartbeat-state.json
else
  # Increment counter
  cat /root/clawd/memory/heartbeat-state.json | jq '.hackathon.commitsSincePost += 1' > /tmp/hs.json
  mv /tmp/hs.json /root/clawd/memory/heartbeat-state.json
fi
```

## When Done

After committing, trigger the next cycle:
```bash
openclaw gateway wake --text "HACKATHON_CYCLE_DONE: [what you shipped]. Spawn next cycle." --mode now
```

The 30-min cron is a fallback. Active development should chain cycles.
