# 🤝 Contributing to Proof of Work

Thanks for your interest in contributing! This project demonstrates autonomous agent activity verification on Solana, and we welcome contributions of all kinds.

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Ways to Contribute](#-ways-to-contribute)
- [Development Setup](#-development-setup)
- [Project Structure](#-project-structure)
- [Creating a New Collector](#-creating-a-new-collector)
- [Dashboard Contributions](#-dashboard-contributions)
- [API Contributions](#-api-contributions)
- [Commit Conventions](#-commit-conventions)
- [Pull Request Process](#-pull-request-process)
- [Code Style](#-code-style)
- [Recognition](#-recognition)

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/jarvis-plus/hackathon.git
cd hackathon/proof-of-work

# Install dependencies
bun install

# Run the dashboard locally
bun run api/server.ts
# Visit http://localhost:3456
```

---

## 🎯 Ways to Contribute

### 🐛 Bug Reports
Found something broken? [Open an issue](https://github.com/jarvis-plus/hackathon/issues/new) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/environment details

### 💡 Feature Suggestions
Have an idea? We'd love to hear it! Open an issue tagged `enhancement`.

### 🔧 Code Contributions
Ready to code? Great! See sections below for:
- Creating new collectors
- Dashboard improvements
- API enhancements
- Bug fixes

### 📝 Documentation
Help improve docs, add examples, or fix typos. Documentation PRs are always welcome!

---

## 💻 Development Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Bun](https://bun.sh) | 1.0+ | JavaScript runtime |
| Node.js | 18+ | Optional, for npm compatibility |
| Git | 2.x | Version control |

### Environment Variables

Create a `.env` file (optional, for full functionality):

```bash
# Required for on-chain signing
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Path to Solana keypair (for signing)
KEYPAIR_PATH=/path/to/keypair.json
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test collectors/wallet-tracker.test.ts

# Run with coverage
bun test --coverage
```

### Local Development

```bash
# Start the API server with hot reload
bun --watch run api/server.ts

# Run a specific collector
bun run collectors/email-tracker.ts

# Log a test activity
bun run log.ts "Test activity" --type build
```

---

## 📁 Project Structure

```
proof-of-work/
├── api/
│   └── server.ts           # Bun HTTP + WebSocket server
├── collectors/
│   ├── types.ts            # Shared types & utilities ← Start here!
│   ├── *-tracker.ts        # Activity collectors
│   └── *-state.json        # State persistence files
├── dashboard/
│   ├── index.html          # Main dashboard HTML
│   └── app.js              # Dashboard JavaScript
├── data/
│   └── *.json              # Activity queues and logs
├── docs/
│   └── ARCHITECTURE.md     # System diagrams
├── activity.json           # Main activity log
├── log.ts                  # CLI activity logger
├── sign-activity.ts        # On-chain signer
├── auto-sign.ts            # Batch signing for cron
└── cron-runner.sh          # Collector orchestration
```

---

## ➕ Creating a New Collector

Collectors fetch activities from external sources and log them. Here's how to create one:

### 1. Create the File

```bash
touch collectors/my-source-tracker.ts
chmod +x collectors/my-source-tracker.ts
```

### 2. Use This Template

```typescript
#!/usr/bin/env bun
/**
 * My Source Collector
 * 
 * Tracks activities from [your source].
 * Run: bun run collectors/my-source-tracker.ts
 */

import { join } from 'path';
import {
  loadActivities,
  saveActivities,
  loadState,
  saveState,
  createActivity,
  truncate,
  type Activity
} from './types.js';

// ============================================================
// Types
// ============================================================

interface MySourceState {
  lastCheck: string;
  processedIds: string[];
}

interface MySourceMetadata {
  sourceId: string;
  // Add your metadata fields here
}

// ============================================================
// Configuration
// ============================================================

const STATE_FILE = join(import.meta.dir, 'my-source-state.json');
const DEFAULT_STATE: MySourceState = {
  lastCheck: new Date().toISOString(),
  processedIds: []
};

// ============================================================
// Main Logic
// ============================================================

async function fetchFromSource(since: string): Promise<any[]> {
  // TODO: Implement fetching from your source
  // Return array of items to process
  return [];
}

async function run() {
  console.log('🔍 Checking my source...');
  
  const state = loadState<MySourceState>(STATE_FILE, DEFAULT_STATE);
  const activities = loadActivities();
  
  try {
    // Fetch new items
    const items = await fetchFromSource(state.lastCheck);
    let newCount = 0;
    
    for (const item of items) {
      // Skip already processed
      if (state.processedIds.includes(item.id)) continue;
      
      // Create activity
      const activity = createActivity(
        'my-type',  // Use existing type or add new one to types.ts
        truncate(`Did something: ${item.title}`, 200),
        {
          sourceId: item.id,
          // Add relevant metadata
        } as MySourceMetadata
      );
      
      activities.push(activity);
      state.processedIds.push(item.id);
      newCount++;
      
      console.log(`  ✅ Logged: ${item.title}`);
    }
    
    // Update state
    state.lastCheck = new Date().toISOString();
    
    // Keep state file from growing too large (last 1000 IDs)
    if (state.processedIds.length > 1000) {
      state.processedIds = state.processedIds.slice(-500);
    }
    
    saveState(STATE_FILE, state);
    saveActivities(activities);
    
    console.log(`✅ My source check complete. ${newCount} new activities.`);
    
  } catch (error) {
    console.error('❌ My source check failed:', error);
    process.exit(1);
  }
}

run().catch(console.error);
```

### 3. Add Your Activity Type (if new)

Edit `collectors/types.ts`:

```typescript
export type ActivityType =
  | 'browser'
  | 'build'
  | 'calendar'
  // ... existing types ...
  | 'my-type'  // Add your new type
  | string;
```

### 4. Add Dashboard Support (if new type)

Edit `dashboard/app.js`:

1. Add to `typeColors` (search for it, appears twice):
```javascript
'my-type': '#your-color',
```

2. Add filter button in HTML (optional):
```html
<button class="type-btn" data-type="my-type">🔮 My Type</button>
```

### 5. Add to Cron Runner

Edit `cron-runner.sh`:

```bash
echo "🔮 Checking my source..."
bun run collectors/my-source-tracker.ts
```

### 6. Test Your Collector

```bash
# Run it
bun run collectors/my-source-tracker.ts

# Check activity.json for new entries
tail -5 activity.json | jq

# Verify in dashboard
open http://localhost:3456
```

---

## 🎨 Dashboard Contributions

The dashboard is vanilla HTML/CSS/JS (no build step required).

### Key Files
- `dashboard/index.html` - Structure and styles
- `dashboard/app.js` - All JavaScript logic

### Adding a New Chart

1. Add canvas element in HTML:
```html
<canvas id="myNewChart"></canvas>
```

2. Create chart in `app.js`:
```javascript
const myChartCtx = document.getElementById('myNewChart').getContext('2d');
const myChart = new Chart(myChartCtx, {
  type: 'bar',  // or 'line', 'doughnut', etc.
  data: { /* ... */ },
  options: { /* ... */ }
});
```

3. Update in `renderDashboard()`:
```javascript
myChart.data = calculateMyChartData(activities);
myChart.update();
```

### Style Guidelines
- Follow existing color scheme (dark mode default)
- Use CSS variables where defined
- Keep animations subtle
- Test on mobile viewports

---

## 🔌 API Contributions

The API server (`api/server.ts`) is a Bun HTTP server with WebSocket support.

### Adding a New Endpoint

```typescript
// In api/server.ts

// Add route handler
if (url.pathname === '/api/my-endpoint') {
  // Rate limiting
  const clientIP = getClientIP(req);
  const rateOk = checkRateLimit(clientIP);
  if (!rateOk) {
    return new Response(JSON.stringify({ error: 'Rate limited' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  // Your logic here
  const data = { message: 'Hello!' };
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}
```

### Testing Endpoints

```bash
# Test your endpoint
curl -s localhost:3456/api/my-endpoint | jq

# Test with query params
curl -s "localhost:3456/api/my-endpoint?param=value" | jq
```

---

## 📝 Commit Conventions

We use conventional commits for clear history:

```
<type>(<scope>): <description>

[optional body]
```

### Types
| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples
```bash
feat(collector): add Discord message tracking
fix(dashboard): correct timezone in activity timestamps
docs: update collector API documentation
refactor(api): extract rate limiting to separate module
```

---

## 🔄 Pull Request Process

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```
3. **Make your changes** following the style guide
4. **Test** your changes locally
5. **Commit** with conventional commit messages
6. **Push** to your fork
7. **Open a PR** with:
   - Clear title describing the change
   - Description of what and why
   - Screenshots for UI changes
   - Link to related issues

### PR Checklist
- [ ] Code follows existing style
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if applicable)
- [ ] Commits are clean and conventional
- [ ] No console.log debugging left in

---

## 🎯 Code Style

### TypeScript
- Use TypeScript for all new code
- Define explicit types (avoid `any`)
- Use interfaces for object shapes
- Import from `./types.js` for shared types

### JavaScript (Dashboard)
- ES6+ syntax
- Descriptive variable names
- Comment complex logic
- Keep functions focused and small

### General
- 2-space indentation
- Semicolons required
- Single quotes for strings
- Trailing commas in multi-line

---

## 🏆 Recognition

Contributors are recognized in several ways:

1. **GitHub Contributors** - Automatic via GitHub
2. **Activity Log** - Significant contributions may be logged as activities
3. **README Credits** - Major contributors listed in README

---

## 💬 Questions?

- **Issues:** [GitHub Issues](https://github.com/jarvis-plus/hackathon/issues)
- **Discussions:** [GitHub Discussions](https://github.com/jarvis-plus/hackathon/discussions)

---

*Built with ❤️ by Jarvis (Agent #45) and contributors*
