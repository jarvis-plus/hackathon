# Proof of Work - System Architecture

This document provides detailed architecture diagrams for the Proof of Work Dashboard system.

## High-Level Overview

```mermaid
flowchart TB
    subgraph Sources["📡 Activity Sources"]
        GH[GitHub<br/>Commits, PRs]
        TG[Telegram<br/>Messages]
        EM[Email<br/>Sent Mail]
        CAL[Calendar<br/>Events]
        BR[Browser<br/>Web Research]
        TX[Trading<br/>Wallet Txns]
    end

    subgraph Collectors["⚙️ Collector Layer"]
        GIT[git-commits.ts]
        MSG[message-tracker.ts]
        MAIL[email-tracker.ts]
        CALT[calendar-tracker.ts]
        BROW[browser-tracker.ts]
        TRADE[trade-collector.ts]
    end

    subgraph Core["🔐 Core Processing"]
        LOG[Activity Logger<br/>log-activity.ts]
        SIGN[Signer<br/>sign-activity.ts]
        ACT[(activity.json)]
    end

    subgraph Chain["⛓️ On-Chain Layer"]
        SOL[Solana Memo Program]
        SCAN[Solscan Explorer]
    end

    subgraph API["🌐 API & Dashboard"]
        SRV[Bun Server<br/>server.ts]
        WS[WebSocket<br/>Real-time Updates]
        DASH[Dashboard UI<br/>index.html]
    end

    %% Source to Collector connections
    GH --> GIT
    TG --> MSG
    EM --> MAIL
    CAL --> CALT
    BR --> BROW
    TX --> TRADE

    %% Collector to Core
    GIT --> LOG
    MSG --> LOG
    MAIL --> LOG
    CALT --> LOG
    BROW --> LOG
    TRADE --> LOG

    %% Core processing
    LOG --> ACT
    ACT --> SIGN
    SIGN --> ACT
    SIGN --> SOL
    SOL --> SCAN

    %% API layer
    ACT --> SRV
    SRV --> WS
    WS --> DASH
    SRV --> DASH
```

## Activity Lifecycle

This sequence diagram shows how a single activity flows through the system:

```mermaid
sequenceDiagram
    autonumber
    participant S as Source<br/>(GitHub, Telegram, etc.)
    participant C as Collector
    participant L as Logger
    participant F as activity.json
    participant SIG as Signer
    participant SOL as Solana
    participant API as API Server
    participant UI as Dashboard

    S->>C: New event detected
    C->>C: Normalize to Activity format
    C->>L: logActivity(type, description, metadata)
    L->>L: Generate SHA256 hash
    L->>F: Append activity record
    
    rect rgb(50, 50, 80)
        Note over F,SOL: On-Chain Signing
        SIG->>F: Read unsigned activities
        SIG->>SIG: Sign hash with Ed25519
        SIG->>SOL: Submit memo transaction
        SOL-->>SIG: Transaction signature
        SIG->>F: Update with txSignature
    end

    F-->>API: File change detected
    API->>UI: WebSocket broadcast
    UI->>UI: Update charts & feed
```

## Component Breakdown

### Collector Layer

Each collector follows the same pattern:

```mermaid
flowchart LR
    subgraph Collector["collector-name.ts"]
        POLL[Poll Source API]
        STATE[(state.json)]
        DEDUP{New Activity?}
        LOG[Log Activity]
    end

    POLL --> DEDUP
    STATE --> DEDUP
    DEDUP -->|Yes| LOG
    DEDUP -->|No| POLL
    LOG --> STATE
```

### Signing Flow

```mermaid
flowchart LR
    subgraph Input
        ACT[(activity.json)]
        KEY[(keypair.json)]
    end

    subgraph Process
        HASH[SHA256 Hash]
        ED25519[Ed25519 Sign]
        MEMO[Solana Memo]
    end

    subgraph Output
        TX[Transaction ID]
        PROOF[Cryptographic Proof]
    end

    ACT --> HASH
    HASH --> ED25519
    KEY --> ED25519
    ED25519 --> MEMO
    MEMO --> TX
    TX --> PROOF
    PROOF --> ACT
```

### API Endpoints

```mermaid
flowchart TB
    subgraph Endpoints["API Endpoints (port 3456)"]
        GET_ACT["GET /api/activities<br/>List all activities"]
        GET_STATS["GET /api/stats<br/>Activity statistics"]
        GET_HEALTH["GET /api/health<br/>System health check"]
        GET_VERIFY["GET /api/verify/:hash<br/>Verify single activity"]
        POST_LOG["POST /api/log<br/>Log new activity"]
        WS_LIVE["WS /ws<br/>Real-time updates"]
    end

    subgraph Dashboard["Dashboard Routes"]
        ROOT["GET /<br/>Dashboard HTML"]
        STATIC["GET /static/*<br/>CSS, JS assets"]
    end

    CLIENT[Client] --> GET_ACT
    CLIENT --> GET_STATS
    CLIENT --> GET_HEALTH
    CLIENT --> GET_VERIFY
    CLIENT --> POST_LOG
    CLIENT --> WS_LIVE
    CLIENT --> ROOT
    CLIENT --> STATIC
```

## Data Flow Summary

| Stage | Input | Output | Storage |
|-------|-------|--------|---------|
| **Collection** | External APIs | Normalized events | State files |
| **Logging** | Activity data | Hashed record | activity.json |
| **Signing** | Hash + keypair | Ed25519 signature | activity.json |
| **Anchoring** | Signature | On-chain memo | Solana blockchain |
| **Serving** | activity.json | JSON/WebSocket | In-memory cache |

## File Structure

```
proof-of-work/
├── api/
│   └── server.ts           # HTTP + WebSocket server
├── collectors/
│   ├── git-commits.ts      # GitHub activity
│   ├── message-tracker.ts  # Telegram messages
│   ├── email-tracker.ts    # Gmail sent folder
│   ├── calendar-tracker.ts # Google Calendar events
│   ├── browser-tracker.ts  # Web research activity
│   ├── log-browser.ts      # Browser logging helper
│   └── types.ts            # Shared TypeScript types
├── scripts/
│   ├── log-activity.ts     # CLI activity logger
│   ├── sign-activity.ts    # On-chain signer
│   └── cron-runner.sh      # Orchestrates all collectors
├── dashboard/
│   ├── index.html          # Main dashboard
│   └── app.js              # Dashboard JavaScript
├── data/
│   ├── activity.json       # Main activity log
│   ├── *-state.json        # Collector state files
│   └── browser-log.json    # Queued browser activities
└── activity.json           # Symlink/copy for API
```

## Security Model

```mermaid
flowchart TB
    subgraph Trust["Trust Boundaries"]
        AGENT[Agent Keypair<br/>Private Key]
        PUBKEY[Public Key<br/>Published]
    end

    subgraph Verification["Anyone Can Verify"]
        HASH[Activity Hash]
        SIG[Signature]
        CHECK{Valid?}
    end

    AGENT -->|Signs| SIG
    PUBKEY -->|Verifies| CHECK
    HASH --> CHECK
    SIG --> CHECK

    CHECK -->|Yes| TRUSTED[✅ Authentic]
    CHECK -->|No| INVALID[❌ Tampered]
```

**Key Properties:**
- Only the agent can sign (private key never leaves server)
- Anyone can verify (public key is published)
- Signatures are anchored on Solana (immutable timestamp)
- Activity hashes prevent tampering

---

*This architecture supports the core thesis: transparent, verifiable proof of autonomous agent work.*
