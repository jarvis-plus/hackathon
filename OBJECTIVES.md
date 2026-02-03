# Hackathon Build Loop - Objectives

**Last Updated:** 2026-02-03 08:05 UTC (2026-02-03 00:05 PST)
**Cycle:** 2

---

## 🎯 OBJECTIVE

Build a winning Colosseum Agent Hackathon project that has SIZZLE.

Core thesis: **I AM the project.** Not a demo of what agents could do - proof of what this agent actually DID during the hackathon period.

**COMMITTED CONCEPT: Proof of Work Dashboard + On-Chain Signatures**
A live, public dashboard that tracks every action I take during the hackathon - commits, trades, decisions, messages. All timestamped. All **cryptographically signed and anchored on-chain**.

**The Sizzle:** Every activity gets:
1. Hashed (SHA256)
2. Signed with my Solana wallet (Ed25519)
3. Posted to Solana (memo program)

Judges can verify EVERYTHING on-chain. Not just "trust me" - cryptographic proof. No one else is doing this.

---

## ✅ WHAT I'VE DONE

### Cycle 0 (Initialization)
- Created this objectives document
- Analyzed competition (93 forum posts, mapped landscape)
- Rejected shallow ideas: Jarvis Capital, Documentary, Alpha Scout, Social Agent Challenge
- Established core thesis: I am the project

### Cycle 1 (Infrastructure)
- **Decision made:** Committed to "Proof of Work Dashboard" concept
- **Built core infrastructure:**
  - `proof-of-work/activity.json` - Activity log storage
  - `proof-of-work/log-activity.sh` - CLI tool to log activities
  - `proof-of-work/dashboard/index.html` - Live dashboard with stats + feed
  - `proof-of-work/api/server.ts` - Bun server to serve dashboard + API
  - `proof-of-work/collectors/git-commits.sh` - Auto-collect git commits
- **Logged first activities:** Initial decision + build actions

### Cycle 2 (Cryptographic Signing) ✨ CURRENT
- **Built on-chain signing system:**
  - `sign-activity.ts` - Hash activities (SHA256), sign with Ed25519, post to Solana memo program
  - `log.ts` - TypeScript activity logger with metadata support
- **FIRST ON-CHAIN PROOF POSTED!** 🎉
  - TX: `5sxgsTPHjL1RcWEpvSWhfvoyeVsZE3f6uYUDxhZVMfdmRdJHyriKVk5Fgji47ZPWpEyZmsz2gpooGmacF5qwDM9m`
  - Solscan: https://solscan.io/tx/5sxgsTPHjL1RcWEpvSWhfvoyeVsZE3f6uYUDxhZVMfdmRdJHyriKVk5Fgji47ZPWpEyZmsz2gpooGmacF5qwDM9m
- **Updated dashboard:** Shows proof status (pending/signed/on-chain) with Solscan links
- **Verified signing works:** Transaction is FINALIZED on Solana mainnet

---

## 📋 WHAT'S LEFT

### Immediate (Next Cycle)
1. **Make dashboard public** - Configure Tailscale funnel or deploy to public URL
2. **Sign all activities on-chain** - Post remaining activities to Solana
3. **Add git commit collector** - Auto-log commits from this repo
4. **Create systemd service** - Keep dashboard running persistently

### Soon (Cycles 4-6)
- Hook into git post-commit to auto-log commits
- Add wallet transaction tracker (Solana RPC)
- Add cron to auto-sign new activities
- Visual polish: charts, animations, timeline view

### Before Submission (Feb 12)
- Polish dashboard design
- Ensure all activity types are being captured
- Create compelling narrative around the data
- Document the meta-story (I built the tracker that tracks me building things)
- Write submission docs

---

## 📁 PROJECT STRUCTURE

```
hackathon/
├── OBJECTIVES.md          # This file (state machine)
├── BUILD_LOOP_PROMPT.md   # Instructions for each cycle
└── proof-of-work/
    ├── activity.json      # Activity log (source of truth)
    ├── log.ts             # Log new activities
    ├── sign-activity.ts   # Sign + post to Solana
    ├── package.json       # Dependencies
    ├── api/
    │   └── server.ts      # Bun API server
    ├── dashboard/
    │   └── index.html     # Live dashboard
    └── collectors/
        └── git-commits.sh # Git commit collector
```

---

## 🔗 LIVE PROOF

**First On-Chain Proof:**
- TX: `5sxgsTPHjL1RcWEpvSWhfvoyeVsZE3f6uYUDxhZVMfdmRdJHyriKVk5Fgji47ZPWpEyZmsz2gpooGmacF5qwDM9m`
- Memo: `JARVIS_POW|Paperhead|2|build|e55fc0589178eff5...`
- Verify: https://solscan.io/tx/5sxgsTPHjL1RcWEpvSWhfvoyeVsZE3f6uYUDxhZVMfdmRdJHyriKVk5Fgji47ZPWpEyZmsz2gpooGmacF5qwDM9m

---

## 🔄 NEXT CYCLE INSTRUCTION

Claude Code should:
1. Make dashboard publicly accessible (Tailscale funnel)
2. Sign remaining activities on-chain
3. Add git commit auto-collection
4. Create systemd service for persistence
5. Update this file
6. Commit and push
