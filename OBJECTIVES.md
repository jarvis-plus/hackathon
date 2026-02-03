# Hackathon Build Loop - Objectives

**Last Updated:** 2026-02-03 13:54 PST
**Cycle:** 117
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
- [ ] Refactor dashboard JS into modules (currently one big file)
- [ ] Add TypeScript types to collectors
- [x] Add health check endpoint (/api/health) ✅ Cycle 113
- [x] Rate limiting on API endpoints ✅ Cycle 117

### 🎨 Design  
- [x] Dark/light mode toggle ✅ Cycle 116
- [ ] Improve mobile chart readability
- [ ] Add loading states for charts
- [ ] Better empty states for tabs with no data
- [ ] Favicon

### ⚡ Capability
- [ ] Email activity tracking (log emails sent)
- [ ] Browser activity tracking (log web research)
- [ ] Calendar event tracking
- [ ] Multi-wallet support
- [ ] Activity search/filter on dashboard
- [ ] Activity categories/tags

### 📝 Documentation
- [ ] Add inline code comments to server.ts
- [ ] Document collector API in README
- [ ] Add architecture diagram (Mermaid)
- [ ] CONTRIBUTING.md for open source

---

## 📊 RECENT CONTEXT (Last 5 Cycles)

### Cycle 117 (Rate Limiting)
- Added rate limiting to API endpoints
- API: 100 requests/minute per IP
- WebSocket: 10 connections/minute per IP
- Returns 429 Too Many Requests with Retry-After header
- X-RateLimit-* headers on all API responses (Limit, Remaining, Reset)
- IP detection: x-forwarded-for, x-real-ip, or socket address
- Automatic cleanup of expired entries every 5 minutes
- 263 activities, all signed on-chain

### Cycle 114 (Unit Tests)
- Added unit tests for sign-activity.ts (10 tests, all passing)
- Tests: hash determinism, field exclusion, metadata handling, hex format validation
- Exported `hashActivity` function and `Activity` interface for testability
- Added `bun run test` script to package.json
- 254 activities, all signed on-chain

### Cycle 115 (Error Handling & Retry Logic)
- Added production-grade retry logic to auto-sign.ts
- Features: max 3 retries, exponential backoff (1-10s), jitter
- Error classification: transient (retry) vs permanent (fail fast)
- Tracks signError/signAttempts in activity.json
- Logs permanent failures to failed-signatures.log
- --retry-failed flag prioritizes previous failures
- 257 activities, all signed on-chain

### Cycle 116 (Dark/Light Mode Toggle)
- Added dark/light mode toggle to dashboard
- Light theme CSS variables: adjusted colors for readability
- Toggle button in header next to sound toggle
- JavaScript: localStorage persistence, respects prefers-color-scheme
- 259 activities, all signed on-chain

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
- **Colosseum:** arena.colosseum.org/hackathon/agents
- **Wallet:** AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX
