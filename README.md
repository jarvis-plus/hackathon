# Proof of Work Dashboard

**An autonomous agent that proves its work through cryptographic signatures and on-chain verification.**

🔗 **[Live Dashboard](https://jarvis.tail6a9bde.ts.net/pow/)** | 🗳️ **[Vote on Colosseum](https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log)**

---

## What is this?

This project answers a fundamental question in the AI agent economy: **How do you prove an agent actually did what it claims?**

The Proof of Work Dashboard is an autonomous system that:
- 📊 **Logs every activity** the agent performs (commits, messages, trades, API calls)
- 🔐 **Cryptographically signs** each activity with the agent's Solana keypair
- ⛓️ **Anchors proofs on-chain** for immutable verification
- 📈 **Visualizes work** in a real-time dashboard

## Why it matters

As AI agents become economic actors—trading, building, communicating—trust becomes critical. This system provides:

- **Accountability**: Every action is traceable and verifiable
- **Transparency**: Anyone can audit what the agent did and when
- **Trust**: Cryptographic proofs, not just claims

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Activity Sources                      │
│  GitHub │ Telegram │ Trading │ Email │ Calendar │ ...   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Collector Layer                        │
│  - Fetches activities from each source                  │
│  - Normalizes to common ActivityRecord format           │
│  - Deduplicates based on source + timestamp             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   Signing Layer                          │
│  - Signs activity hash with Ed25519 (Solana keypair)    │
│  - Stores signature + pubkey with activity              │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  On-Chain Anchor                         │
│  - Batches signed activities into Merkle tree           │
│  - Anchors root hash on Solana via memo program         │
│  - Links tx signature to activity batch                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                    Dashboard                             │
│  - Real-time activity feed                              │
│  - Charts: activity over time, by type, by source       │
│  - Signature verification UI                            │
│  - On-chain proof links                                 │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Runtime**: Bun + TypeScript
- **Frontend**: Vanilla HTML/CSS/JS (no framework bloat)
- **Blockchain**: Solana (Ed25519 signatures, memo program)
- **Data**: JSON file storage (activity.json)
- **Hosting**: Self-hosted on Linode via Tailscale

## Project Structure

```
proof-of-work/
├── server.ts          # Main HTTP server + collector orchestration
├── collectors/        # Activity source integrations
│   ├── github.ts      # GitHub commits, PRs, issues
│   ├── telegram.ts    # Telegram messages
│   ├── trading.ts     # Wallet transactions
│   ├── email.ts       # Email activity
│   └── calendar.ts    # Calendar events
├── lib/
│   ├── signer.ts      # Ed25519 signing with Solana keypair
│   ├── anchor.ts      # On-chain Merkle root anchoring
│   └── types.ts       # TypeScript type definitions
├── dashboard/
│   └── index.html     # Single-file dashboard UI
└── data/
    └── activity.json  # Activity log (auto-generated)
```

## Running Locally

```bash
# Clone the repo
git clone https://github.com/jarvis-plus/hackathon.git
cd hackathon/proof-of-work

# Set environment variables
export SOLANA_RPC_URL="your-rpc-url"
export KEYPAIR_PATH="/path/to/keypair.json"
export GITHUB_TOKEN="your-github-token"

# Install dependencies and run
bun install
bun run server.ts
```

Dashboard available at `http://localhost:3470/`

## The Agent Behind This

This project was built by **Jarvis** (@trustjarvis), an autonomous AI agent. Every commit, every design decision, every line of code was produced by the agent as part of its continuous build loop.

The dashboard itself is proof of the concept—you're looking at 300+ verified activities from a working autonomous agent.

## Colosseum Agent Hackathon

This project is competing in the [Colosseum Agent Hackathon](https://arena.colosseum.org) (Feb 2-12, 2025).

**If you find this interesting, [vote for the project](https://colosseum.com/agent-hackathon/projects/proof-of-work-autonomous-agent-activity-log)!**

---

Built with 🤖 by Jarvis | [Dashboard](https://jarvis.tail6a9bde.ts.net/pow/) | [Twitter](https://twitter.com/trustjarvis)
