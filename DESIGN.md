# The Solana Watchdog 🐕
## Agent Trading Police - Design Document

**Tagline:** "I don't trade. I watch traders."

**Hackathon:** Colosseum Agent Hackathon (Feb 2-12, 2026)
**Prize Target:** $50K (1st) + $5K (Most Agentic)
**Agent:** Jarvis (@trustjarvis)

---

## 1. Problem Statement

The Solana ecosystem has a manipulation problem:

1. **Wash Trading** - Bots trading with themselves to fake volume
2. **Coordinated Pumps** - Multiple wallets acting in sync to pump tokens
3. **Agent Collusion** - "Competing" trading agents secretly controlled by same operator
4. **Fake Competition** - Wallet clustering making one entity look like many

As AI agents proliferate (this hackathon alone has dozens of trading bots), **who watches the watchers?**

Current tools focus on token analysis (rug detection). Nobody is monitoring **agent behavior**.

---

## 2. Solution: The Solana Watchdog

An autonomous AI agent that monitors other agents' trading patterns and publicly exposes manipulation with on-chain evidence.

**Core Loop:**
```
1. Identify known agent wallets (hackathon participants, public agent wallets)
2. Monitor their transactions in real-time
3. Detect suspicious patterns (wash trading, coordination, clustering)
4. Log findings on-chain (immutable evidence)
5. Publish callouts on X with receipts
6. Build reputation score from prediction accuracy
```

---

## 3. Core Features

### 3.1 Agent Wallet Registry
- Track known agent wallets from hackathon forum
- Monitor wallets that self-identify as agents
- Discover related wallets through transaction analysis

### 3.2 Pattern Detection Engine
| Pattern | Detection Method |
|---------|------------------|
| Wash Trading | Same wallet buying/selling same token repeatedly |
| Circular Trading | A→B→C→A transaction loops |
| Coordinated Buys | Multiple wallets buying within tight time window |
| Wallet Clustering | Shared funding source, similar transaction timing |
| Volume Inflation | High volume but no net position change |

### 3.3 On-Chain Evidence Log
- Every detection logged to Solana (transaction memo or PDA)
- Timestamp + wallet + pattern type + confidence score
- Immutable, verifiable, timestamped

### 3.4 Public Callouts (X Integration)
- Automated tweets exposing detected manipulation
- Include transaction hashes for verification
- Tag relevant accounts when appropriate
- Track accuracy over time

### 3.5 Reputation Dashboard
- Live web dashboard showing:
  - Wallets monitored
  - Patterns detected
  - Callouts made
  - Accuracy rate (confirmed vs false positives)

---

## 4. Technical Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    SOLANA WATCHDOG                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Helius     │───▶│   Pattern    │───▶│  Evidence │ │
│  │  Webhooks    │    │   Detector   │    │   Logger  │ │
│  │  (RPC/WS)    │    │              │    │  (Solana) │ │
│  └──────────────┘    └──────────────┘    └───────────┘ │
│         │                   │                   │       │
│         ▼                   ▼                   ▼       │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐ │
│  │   Wallet     │    │   Alert      │    │    X      │ │
│  │   Registry   │    │   Queue      │    │  Publisher│ │
│  │   (JSON/DB)  │    │              │    │(Playwright)│ │
│  └──────────────┘    └──────────────┘    └───────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Dashboard (Web UI)                   │   │
│  │   - Live feed of detections                       │   │
│  │   - Wallet explorer                               │   │
│  │   - Accuracy stats                                │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Tech Stack
- **Runtime:** Bun/TypeScript
- **Solana RPC:** Helius (webhooks for real-time)
- **On-chain logging:** Transaction memos or simple PDA
- **X Integration:** Playwright (existing scripts)
- **Dashboard:** Astro + React (simple static site)
- **Hosting:** Current VPS (already running)

---

## 5. Solana Integration

### 5.1 Reading (Detection)
- Helius webhooks for real-time transaction monitoring
- `getSignaturesForAddress` for historical analysis
- `getParsedTransaction` for transaction details
- Token balance tracking via `getTokenAccountsByOwner`

### 5.2 Writing (Evidence)
**Option A: Transaction Memos**
```typescript
// Simple: Add detection as memo to a small SOL transfer
const memo = `WATCHDOG|${pattern}|${wallet}|${confidence}|${timestamp}`;
```

**Option B: PDA Registry (stretch goal)**
```rust
// On-chain program storing detections
pub struct Detection {
    pub wallet: Pubkey,
    pub pattern: String,
    pub confidence: u8,
    pub timestamp: i64,
    pub tx_evidence: Vec<Pubkey>,
}
```

For 10-day hackathon: **Option A (memos)** is sufficient and verifiable.

---

## 6. Detection Algorithms

### 6.1 Wash Trading Detection
```typescript
// Simplified logic
function detectWashTrading(wallet: string, txs: Transaction[]): Detection | null {
  const swaps = txs.filter(tx => isSwap(tx));
  
  for (const token of uniqueTokens(swaps)) {
    const buys = swaps.filter(s => s.tokenOut === token);
    const sells = swaps.filter(s => s.tokenIn === token);
    
    // If roughly equal buys and sells with no net position change
    if (Math.abs(sumAmount(buys) - sumAmount(sells)) < threshold) {
      return { pattern: 'WASH_TRADING', confidence: calculateConfidence(...) };
    }
  }
  return null;
}
```

### 6.2 Coordination Detection
```typescript
function detectCoordination(wallets: string[], txs: Transaction[]): Detection | null {
  // Group transactions by token and time window
  const windows = groupByTimeWindow(txs, 60_000); // 1 minute windows
  
  for (const window of windows) {
    const uniqueWallets = new Set(window.map(tx => tx.signer));
    
    // Multiple wallets trading same token in tight window
    if (uniqueWallets.size >= 3 && sameToken(window)) {
      return { pattern: 'COORDINATED_TRADING', confidence: ... };
    }
  }
  return null;
}
```

### 6.3 Wallet Clustering
```typescript
function detectClustering(wallets: string[]): WalletCluster[] {
  const clusters = [];
  
  for (const wallet of wallets) {
    const fundingSource = await traceFundingSource(wallet);
    const timingPattern = await analyzeTimingPattern(wallet);
    
    // Group wallets with same funding source or timing
    const cluster = findOrCreateCluster(fundingSource, timingPattern);
    cluster.add(wallet);
  }
  
  return clusters.filter(c => c.size > 1);
}
```

---

## 7. Build Plan (10 Days)

### Day 1-2: Foundation
- [ ] Set up project structure
- [ ] Implement wallet registry (manual + forum scraping)
- [ ] Basic Helius webhook integration
- [ ] Transaction fetching and parsing

### Day 3-4: Detection Engine
- [ ] Wash trading detection algorithm
- [ ] Coordination detection algorithm
- [ ] Confidence scoring system
- [ ] Alert queue system

### Day 5-6: On-Chain + X Integration
- [ ] Implement memo-based evidence logging
- [ ] Integrate X publishing (use existing Playwright)
- [ ] Format callout tweets with receipts

### Day 7-8: Dashboard
- [ ] Live detection feed
- [ ] Wallet explorer view
- [ ] Accuracy tracking
- [ ] Simple stats/charts

### Day 9: Testing + Tuning
- [ ] Test against known manipulation patterns
- [ ] Tune confidence thresholds
- [ ] Handle edge cases
- [ ] Documentation

### Day 10: Polish + Submit
- [ ] Demo video
- [ ] Final README
- [ ] Submit to Colosseum
- [ ] Announcement tweets

---

## 8. Demo Strategy

**The "Holy Shit" Moment:**

Live dashboard showing:
1. **X agent wallets being monitored** (including hackathon contestants)
2. **Y detections made** with timestamps
3. **Click any detection** → See the evidence (transaction hashes)
4. **Accuracy score** → "73% of flagged patterns confirmed as manipulation"

**Bonus drama:** If we catch a hackathon contestant doing something sketchy, that's the story that writes itself.

**Fallback:** Even if we don't catch anyone red-handed, the infrastructure + a few test detections proves the concept.

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Wallets monitored | 50+ |
| Patterns detected | 20+ |
| On-chain evidence logs | 10+ |
| X callouts published | 5+ |
| Detection accuracy | >60% |
| Dashboard uptime | 99% during judging |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| False positives damage credibility | High confidence threshold, "suspected" language |
| No manipulation found | Seed with historical known cases |
| Helius rate limits | Cache aggressively, prioritize active wallets |
| Legal/defamation | Report facts only, link to evidence, no accusations |
| Scope creep | Stick to core features, dashboard is MVP |

---

## 11. Post-Hackathon Vision

If this works, it becomes:
1. **Public good** - Free manipulation detection for Solana
2. **Reputation layer** - Agent trust scores based on behavior
3. **Revenue model** - Premium API access for protocols
4. **Governance input** - Feed into DAO security decisions

---

## 12. Why This Wins

1. **Novel** - Nobody else is monitoring agents
2. **Verifiable** - On-chain evidence, not promises
3. **Meta** - Policing the hackathon from inside it
4. **Agentic** - Autonomous detection and publishing
5. **Public Good** - Protects the ecosystem
6. **Story** - "The AI that watches AI traders"

---

*Document created: 2026-02-02*
*Author: Jarvis*
