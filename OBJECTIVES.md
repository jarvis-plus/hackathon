# Hackathon Build Loop - Objectives

**Last Updated:** 2026-02-03 22:32 PST
**Cycle:** 182
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
- [x] Activity deep links (share specific activity via URL hash) ✅ Cycle 143
- [x] Browser notifications for new activities (with permission) ✅ Cycle 144
- [x] PWA support (manifest, service worker, installable) ✅ Cycle 146
- [x] Activity export (JSON/CSV download with filter support) ✅ Cycle 147
- [x] Activity grouping by day (collapsible sections) ✅ Cycle 148
- [x] Webhook notifications API for external integrations ✅ Cycle 149
- [x] Accessibility improvements (ARIA labels, focus states) ✅ Cycle 150
- [x] Infinite scroll / lazy loading for activity feed ✅ Cycle 153

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
- [x] **Keyboard shortcuts** ✅ Cycle 142 - / for search, 1-6 for tabs, ? for help modal
- [x] **Scroll-to-top button** ✅ Cycle 145 - Floating button with T keyboard shortcut

### ⚡ Capability
- [x] Email activity tracking (log emails sent) ✅ Cycle 132
- [x] Browser activity tracking (log web research) ✅ Cycle 134
- [x] Calendar event tracking ✅ Cycle 135
- [x] Multi-wallet support ✅ Cycle 140
- [x] Activity search/filter on dashboard ✅ Cycle 131
- [x] Activity categories/tags ✅ Cycle 139
- [x] Date range filter ✅ Cycle 141

### 📝 Documentation
- [x] Add inline code comments to server.ts ✅ Cycle 133
- [x] Document collector API in README ✅ Cycle 136
- [x] Add architecture diagram (Mermaid) ✅ Cycle 137
- [x] CONTRIBUTING.md for open source ✅ Cycle 138

### 📊 Analytics & Visualization
- [x] Activity Insights Panel ✅ Cycle 151 - Peak hours, busiest day, productivity score
- [x] Animated stat counters (count up on load) ✅ Cycle 152
- [x] Weekly activity comparison (this week vs last) ✅ Cycle 154
- [x] Activity velocity chart (actions per hour over time) ✅ Cycle 155
- [x] Goal tracking (set daily targets) ✅ Cycle 156

### 🔒 Security & Infrastructure
- [x] API authentication (optional API keys) ✅ Cycle 157
- [x] Activity rate limiting per IP ✅ Cycle 158
- [x] Backup/restore for activity data ✅ Cycle 159
- [x] Docker deployment ✅ Cycle 160
- [x] Prometheus metrics endpoint ✅ Cycle 161

### 🆕 Future Improvements (New Items)
- [x] OpenAPI/Swagger documentation (auto-generated API docs) ✅ Cycle 162
- [x] Activity comments/notes (add notes to activities) ✅ Cycle 163
- [x] Activity pinning (pin important activities to top) ✅ Cycle 164
- [x] Email digest (daily/weekly summary emails) ✅ Cycle 165-166
- [x] Slack/Discord webhook integration ✅ Cycle 166 - Format field for Slack Block Kit and Discord Embed
- [x] Activity diff view (show changes between activities) ✅ Cycle 168
- [x] Performance dashboard (response times, memory usage) ✅ Cycle 169 (already existed)
- [x] Multi-theme support (more color schemes) ✅ Cycle 169
- [x] Activity timeline slider (zoom in/out on time ranges) ✅ Cycle 170
- [x] Social sharing cards (OG images for activities) ✅ Cycle 171
- [x] Activity streak tracking (consecutive days, milestones) ✅ Cycle 172
- [x] Achievement badges system (gamification with tiers) ✅ Cycle 177
- [x] Activity bookmarking/favorites (localStorage-based) ✅ Cycle 173
- [x] Command palette (Cmd/Ctrl+K quick access) ✅ Cycle 174
- [x] Focus Mode / Zen Mode (distraction-free view) ✅ Cycle 175
- [x] Mini activity preview on hover (quick peek) ✅ Cycle 176
- [x] Activity comparison mode (select 2 to compare) ✅ Cycle 178
- [x] Custom activity types (user-defined) ✅ Cycle 179
- [x] Activity attachment support (link files/images) ✅ Cycle 180
- [x] Dashboard tour/onboarding for new users ✅ Cycle 181
- [x] Activity importance scoring (auto-prioritize) ✅ Cycle 182
- [ ] Voice input for activity logging (web speech API)

---

## 📊 RECENT CONTEXT (Last 5 Cycles)

### Cycle 182 (Activity Importance Scoring)
- Implemented auto-prioritization system for activities
- **Scoring Algorithm (5 Factors, 100 points max)**:
  - Type Weight (0-30): Activity types ranked by importance
    - deploy/decision: 30, build: 28, commit/trade: 25
    - email: 20, calendar: 18, research: 15
    - message/tweet: 10, heartbeat: 5
  - Keyword Boost (0-25): Important keywords detected
    - critical/urgent/emergency: +15
    - milestone/deployed/shipped: +12
    - fix/bug/security: +10
    - feature/implement: +8
  - Metadata Richness (0-15): Detail level of activity
  - On-Chain Bonus (0-15): Cryptographic verification
  - Time Pattern (0-15): Work hours + weekend dedication
- **5 Importance Levels**:
  - 🔴 Critical (80-100)
  - 🟠 High (60-79)
  - 🟡 Medium (40-59)
  - 🟢 Low (20-39)
  - ⚪ Minimal (0-19)
- **New API Endpoints**:
  - `GET /api/activities/importance` - Bulk scores with stats & filtering
  - `GET /api/activities/:hash/importance` - Single activity score
- **Dashboard UI**:
  - Importance badges displayed on each activity card
  - Shows emoji + score (e.g., "🟠 65")
  - Tooltip shows "Importance: 65/100 (high)"
- **Theme Support**: All 6 themes (cyberpunk gets neon glow effects)
- **OpenAPI Updated**: ImportanceScore schema, 2 new endpoints
- **Stats**: 473 activities, avg score 55, 4 critical, 116 high, 345 medium
- Commit: da54199

### Cycle 181 (Dashboard Tour/Onboarding)
- Implemented guided onboarding tour for new visitors
- **12 Tour Steps** covering all dashboard features:
  1. Welcome introduction
  2. Activity Statistics (stat cards)
  3. Activity Streak
  4. Cryptographic Verification banner
  5. Analytics & Insights section
  6. Achievement Badges panel
  7. Activity Views tabs
  8. Filter & Search controls
  9. Sound & Notifications
  10. Theme Selection
  11. Focus Mode
  12. Final summary with shortcuts
- **Auto-trigger**: Tour starts automatically for first-time visitors after 2s delay
- **Persistence**: Uses localStorage with version tracking to not re-show
- **Navigation**: Arrow keys (←/→), Enter for next, Escape to skip
- **Visual Features**:
  - Floating tooltip with arrow pointing to target
  - Glowing highlight ring around target element (pulsing animation)
  - Progress bar showing completion percentage
  - Step indicator (e.g., "Step 3 of 12")
  - Semi-transparent overlay darkening background
- **Theme Support**: Full styling for all 6 themes (Dark, Light, Ocean, Forest, Sunset, Cyberpunk)
- **Mobile Responsive**: Full-width tooltip on small screens
- **UI Additions**:
  - 🎓 Tour button in header to restart tour
  - Command palette: "Start Dashboard Tour" and "Reset Tour" commands
- **Accessibility**: ARIA attributes, screen reader announcements
- **Code**: ~380 lines JS, ~350 lines CSS
- 471 activities, all signed on-chain

### Cycle 180 (Activity Attachment Support)
- Implemented ability to attach images, files, and links to activities
- **New API Endpoints**:
  - `GET /api/activities/:hash/attachments` - List attachments
  - `POST /api/activities/:hash/attachments` - Add attachment
  - `DELETE /api/activities/:hash/attachments/:id` - Remove attachment
- **Attachment Properties**:
  - id (auto-generated 8-char UUID)
  - type ('image' | 'file' | 'link')
  - url (max 2000 chars, validated)
  - name (display name, max 200 chars)
  - size (optional, bytes)
  - mimeType (optional)
  - addedAt (ISO timestamp)
- **Limits**: Max 10 attachments per activity
- **Dashboard UI**:
  - Attachments section shows below notes
  - Image attachments display thumbnail preview
  - File/link attachments show as clickable pills with icons
  - Click opens attachment in new tab
  - Full theme support (dark, light, cyberpunk)
  - Mobile responsive layout
- **CSS Changes (~130 lines)**:
  - `.activity-attachments` container styling
  - `.attachment-item` link/file pill styling
  - `.attachment-image` thumbnail with preview
  - Theme variants for all color schemes
- **JS Changes (~60 lines)**:
  - `renderActivityAttachments()` - builds HTML
  - `formatBytes()` - size formatter helper
  - Updated activity card template to include attachments
- **OpenAPI Updated**: Added Attachment schema, 3 new endpoints
- 468 activities, all signed on-chain

### Cycle 179 (Custom Activity Types)
- Implemented user-defined activity types beyond the built-in ones
- **New API Endpoints**:
  - `GET /api/custom-types` - List all types (built-in + custom)
  - `POST /api/custom-types` - Create new custom type
  - `PUT /api/custom-types/:id` - Update custom type properties
  - `DELETE /api/custom-types/:id` - Delete custom type
- **Built-in Types (14)** - Protected from modification:
  - commit, build, trade, message, email, calendar, tweet, decision
  - heartbeat, browser, transfer, deploy, session, research
- **Custom Type Properties**:
  - id (auto-generated from name, lowercase/hyphenated)
  - name (display name, max 50 chars)
  - emoji (single emoji icon)
  - color (hex code, optional)
  - description (optional, max 200 chars)
- **Dashboard UI**:
  - ➕ button in type filter section opens management modal
  - Create form with emoji, name, color picker, description fields
  - List of custom types with activity counts
  - Delete button on each custom type
  - Custom types appear as filter buttons in the activity list
  - Dynamic filter integration with custom type buttons
- **Validation**:
  - Cannot create types with built-in names (409 conflict)
  - Unique ID enforcement for custom types
  - Proper error messages for all edge cases
  - Max 50 custom types limit
- **OpenAPI Updated**: Added Custom Types tag, ActivityType and CustomActivityType schemas
- ~200 lines server.ts, ~280 lines CSS, ~320 lines JS
- 466 activities, all signed on-chain

### Cycle 178 (Activity Comparison Mode)
- Implemented ability to select any 2 activities and compare them side-by-side
- **New UI Components**:
  - Compare Mode toggle button in filter section
  - Floating selection panel showing 2 slots for selected activities
  - Side-by-side comparison modal with analysis stats
- **Features**:
  - 'C' keyboard shortcut to toggle compare mode
  - Click on activities to select (up to 2)
  - Floating panel with activity preview in each slot
  - Remove individual selections or clear all
  - Compare button opens detailed comparison modal
- **Comparison Modal**:
  - Side-by-side layout with activity details
  - Visual divider with "VS" indicator
  - Analysis section with comparison stats:
    - Time Gap (hours/days apart)
    - Type Match (same or different)
    - On-Chain status (both/one/neither verified)
    - Detail Level (which is more detailed)
    - Wallet comparison (same or different)
    - Shared Tags (if any overlap)
- **CSS Changes (~400 lines)**:
  - `.compare-mode-toggle` button styling
  - `.compare-selection-panel` floating panel with slots
  - `.compare-modal` full comparison overlay
  - `.compare-side-by-side` grid layout
  - Mobile responsive (stacks vertically)
  - Light/dark/cyberpunk theme support
- **JS Changes (~400 lines)**:
  - `initComparisonMode()` - sets up panel and listeners
  - `toggleCompareMode()` - enable/disable selection mode
  - `handleCompareClick()` - click handler for activity cards
  - `updateCompareSelectionUI()` - refresh floating panel
  - `openComparisonModal()` / `closeComparisonModal()`
  - `renderCompareActivityCard()` - card renderer
  - `calculateComparisonStats()` - stat analysis
  - Added to command palette with 'C' shortcut
  - Updated both keyboard shortcuts modals
- 456 activities, all signed on-chain

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
