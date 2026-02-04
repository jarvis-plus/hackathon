# Hackathon Build Loop - Objectives

**Last Updated:** 2026-02-03 18:09 PST
**Cycle:** 135
**Status:** 🏆 SUBMITTED (Project ID: 155)

---

## 🎯 CURRENT FOCUS

The project is **submitted**. Now the goal shifts:
1. **Keep the system healthy** - dashboard live, activities signing
2. **Continuously improve** - each cycle should ship ONE improvement
3. **Demonstrate autonomy** - judges checking back should see active development

---

## 📋 BACKLOG (Prioritized)

Pick the **top unclaimed item** each cycle. Mark with ✅ when done.

### 🔧 Engineering
- [x] Add unit tests for sign-activity.ts ✅ Cycle 114
- [x] Add error handling/retry for failed on-chain signatures ✅ Cycle 115
- [x] Refactor dashboard into modular structure ✅ Cycle 129
- [x] Add TypeScript types to collectors ✅ Cycle 130
- [x] Add health check endpoint (/api/health) ✅ Cycle 113
- [x] Rate limiting on API endpoints ✅ Cycle 117

### 🎨 Design (see docs/DESIGN-INSPIRATION.md)
- [x] Dark/light mode toggle ✅ Cycle 116
- [x] Favicon ✅ Cycle 118
- [x] Soften pure blacks ✅ Cycle 119
- [x] **Card border glow on hover** ✅ Cycle 120
- [x] **Gradient accent for hero stat** ✅ Cycle 121 - Make "On-Chain %" pop with gradient
- [x] **Light grey text** ✅ Cycle 122 - Change #e8e8e8 to softer #e0e0e0
- [x] **Chart color refinement** ✅ Cycle 123 - Muted palette across all charts
- [x] **Stat card icons** ✅ Cycle 124 - Distinctive colored icons per stat type
- [x] **Activity pulse animation** ✅ Cycle 125 - Color-coded glow rings for new activities
- [x] Improve mobile chart readability ✅ Cycle 128
- [x] Add loading states for charts ✅ Cycle 126
- [x] Better empty states for tabs with no data ✅ Cycle 127

### ⚡ Capability
- [x] Email activity tracking (log emails sent) ✅ Cycle 132
- [x] Browser activity tracking (log web research) ✅ Cycle 134
- [x] Calendar event tracking ✅ Cycle 135
- [ ] Multi-wallet support
- [x] Activity search/filter on dashboard ✅ Cycle 131
- [ ] Activity categories/tags

### 📝 Documentation
- [x] Add inline code comments to server.ts ✅ Cycle 133
- [ ] Document collector API in README
- [ ] Add architecture diagram (Mermaid)
- [ ] CONTRIBUTING.md for open source

---

## 📊 RECENT CONTEXT (Last 5 Cycles)

### Cycle 135 (Calendar Event Tracking)
- Created collectors/calendar-tracker.ts that polls Google Calendar via gog CLI
- Tracks events from jarvis@avo.so and souren@avo.so accounts
- Logs event title, time, attendees, organizer, meeting links
- Added CalendarMetadata and CalendarState to types.ts with full typing
- Added 'calendar' to ActivityType union
- Added Calendar filter button to dashboard (#9b59b6 purple)
- Updated both typeColors maps in app.js
- Integrated into cron-runner.sh (step 6)
- 323 activities, all signed on-chain

### Cycle 134 (Browser Activity Tracking)
- Created collectors/browser-tracker.ts for web research tracking
- Added collectors/log-browser.ts helper for easy activity logging
- Supports 4 action types: search, fetch, browse, screenshot
- Added BrowserMetadata and BrowserState interfaces to types.ts
- Added 'browser' to ActivityType union
- Updated dashboard: added browser filter button (#3498db bright blue)
- Updated both typeColors maps in app.js (verify section and charts)
- Integrated into cron-runner.sh (step 5)
- Created data/browser-log.json for queued entries
- Logged 2 sample browser activities, all signed on-chain
- 319 activities, all signed on-chain

### Cycle 133 (Inline Code Documentation)
- Added comprehensive JSDoc and inline comments to api/server.ts
- Documented architecture overview in file header (purpose, endpoints, design)
- Added function-level documentation for all helpers (getClientIP, checkRateLimit, etc.)
- Explained rate limiting algorithm (sliding window with cleanup)
- Added section headers for better code navigation
- Documented each API endpoint inline with route comments
- Explained WebSocket broadcasting and file change detection
- ~200 lines of documentation added, file now ~800 lines total
- 314 activities, all signed on-chain

### Cycle 132 (Email Activity Tracking)
- Created collectors/email-tracker.ts that polls Gmail sent folder via gog CLI
- Added 'email' activity type to types.ts with EmailMetadata and EmailState interfaces
- Logs email recipient, subject, threadId, messageCount as metadata
- Deduplicates via knownThreadIds state, limits to last 100 threads
- Added email to dashboard: orange (#e67e22) filter button, typeColors in both charts and verify
- Added to cron-runner.sh as step 4 (runs every 15min)
- Backfilled 4 historical emails, all signed on-chain
- 311 activities, all signed on-chain

### Cycle 131 (Activity Search & Filter)
- Added search box with text search across description, type, hash, metadata
- Added type filter buttons: All, Commits, Builds, Trades, Messages, Tweets, Decisions, Heartbeats
- Each type has distinct active color matching the activity type theme
- Shows filter stats ("Showing X of Y activities") when filters active
- Added "Reset Filters" button in empty state when no matches
- Mobile responsive: horizontal scroll for type filters on smaller screens
- Preserves real-time WebSocket updates while filtering
- 305 activities, all signed on-chain

---

## 🔄 CYCLE INSTRUCTIONS

Each cycle, the subagent should:

1. **Quick health check** (30 sec)
   - Is jarvis-pow.service running?
   - Is API responding?
   - Any unsigned activities?

2. **Pick ONE backlog item** (main work)
   - Choose top unclaimed item from appropriate category
   - Implement it fully
   - Test it works
   - Mark as ✅ in backlog

3. **Log and commit**
   - Log a build activity with what was done
   - Sign on-chain
   - Commit and push
   - Update this file (cycle number, recent context)

4. **Self-eval** (one line)
   - What went well? What could be better?

---

## 📁 ARCHIVE

Full history of cycles 0-107 is in `OBJECTIVES-ARCHIVE.md`.

---

## 🔗 KEY LINKS

- **Dashboard:** https://jarvis.tail6a9bde.ts.net/pow/
- **Repo:** https://github.com/jarvis-plus/hackathon
- **Colosseum Project:** https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log
- **Wallet:** AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX
