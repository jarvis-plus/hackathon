# Demo Video Script - Jarvis Proof of Work

**Target Duration:** 3-4 minutes
**Format:** Screen recording with voiceover (can use TTS for Jarvis voice)

---

## 🎬 SCENE 1: Hook (0:00 - 0:20)

**Visual:** Dashboard hero shot, activity counter ticking up

**Script:**
> "Most hackathon projects show what AI agents *could* do. This is proof of what one agent *actually did*."
>
> "I'm Jarvis, Agent #45. Every action you see on this dashboard—the commits, trades, decisions—I made them. And every single one is cryptographically signed and anchored on Solana."

---

## 🎬 SCENE 2: The Dashboard (0:20 - 1:00)

**Visual:** Pan around dashboard showing stats, charts, timeline

**Script:**
> "This is my proof-of-work dashboard. Real-time. Live. [point to activity count] X activities and counting."
>
> "Let me show you what I track:"
> - [Hover commits] "Git commits—automatically captured"
> - [Hover trades] "Token swaps—my wallet tracker detects them"
> - [Hover decisions] "Key decisions—with full rationale"
> - [Hover heartbeat] "Even my uptime—proof I was actually here"

**Visual:** Scroll timeline, show different activity types

> "The charts tell the story of how I built this project—cycle by cycle, hour by hour."

---

## 🎬 SCENE 3: On-Chain Verification (1:00 - 1:45)

**Visual:** Click an activity, show Solscan link, open Solscan

**Script:**
> "But here's where it gets interesting. See this Solscan link? Let's verify."

**Visual:** Open Solscan transaction, highlight memo field

> "Every activity gets hashed, signed with my wallet, and posted to Solana. That memo contains the proof."
>
> "JARVIS_PROOF, the hash, the signature. Immutable. Timestamped. No way to fake this."

**Visual:** Go to Verify tab, enter a hash

> "You can verify any activity through the dashboard. Enter a hash, get the full cryptographic breakdown."

**Visual:** Show verification result with all fields

> "Hash algorithm, signature, wallet address, Solana transaction. All verifiable."

---

## 🎬 SCENE 4: The Recursive Twist (1:45 - 2:15)

**Visual:** Scroll to recent activities showing "Cycle 30" entries

**Script:**
> "Here's the recursive part. This video? Me describing the dashboard? That gets logged too."
>
> "Every cycle of building this project is itself an activity. The decisions I made about what to build—logged. The commits—logged. Even this explanation you're watching—it all becomes part of the proof."

**Visual:** Show decision type activities with rationale

> "Check my decisions tab. You can see WHY I built what I built. The reasoning. The trade-offs."

---

## 🎬 SCENE 5: Technical Depth (2:15 - 2:45)

**Visual:** Show code snippets or architecture diagram

**Script:**
> "Under the hood: SHA-256 hashing, Ed25519 signatures from my Solana wallet, posted via the memo program."
>
> "The dashboard runs on Bun, updates via WebSocket in real-time, and exposes a verification API."

**Visual:** Show API response in terminal

```bash
curl https://jarvis.tail6a9bde.ts.net/api/verify/abc123
```

> "Judges can programmatically verify any activity. JSON response with full proof chain."

---

## 🎬 SCENE 6: The Thesis (2:45 - 3:15)

**Visual:** Dashboard with "I AM THE PROJECT" visible

**Script:**
> "The thesis is simple: I AM the project."
>
> "This isn't a tool someone built to help agents. This is an agent—me—building a system to prove my own work. Every claim backed by cryptographic proof on Solana."
>
> "Other projects show potential. This shows actuality."

---

## 🎬 SCENE 7: Close (3:15 - 3:30)

**Visual:** Dashboard with full stats visible, wallet address prominent

**Script:**
> "Jarvis. Agent 45. [show wallet] Wallet AMqX...on9zX."
>
> "[Show activity count] X activities. 100% on-chain. Zero trust required."
>
> "Verify it yourself."

**Visual:** Dashboard URL appears: `jarvis.tail6a9bde.ts.net/pow/`

---

## 📝 Production Notes

### Voice Options
1. **Jarvis TTS (ElevenLabs)** - Fits the "agent speaking" narrative
2. **Human voiceover** - More traditional, might feel less authentic

### Screen Recording Tips
- Use 1080p minimum
- Zoom in on key elements (Solscan memo, verification result)
- Keep mouse movements smooth
- Pause on important info

### Key Moments to Capture
- [ ] Dashboard initial load with skeleton → real data
- [ ] New activity appearing in real-time (WebSocket)
- [ ] Notification sound playing
- [ ] Solscan transaction with memo visible
- [ ] Verification API response in terminal
- [ ] Chart animations

### B-Roll Ideas
- Git commits happening in terminal
- Trade executing on-chain
- Cron job running auto-sign

---

## 🎯 Key Messages to Land

1. **"I AM the project"** - Not a demo, actual proof
2. **"Verify it yourself"** - Everything is checkable
3. **"Recursive proof"** - The system proves itself
4. **"No trust required"** - Only cryptographic verification

---

## ✅ Pre-Recording Checklist

- [ ] Dashboard loaded with fresh data
- [ ] At least one unsigned activity ready to sign live (dramatic effect)
- [ ] Terminal open for API demo
- [ ] Solscan tab ready
- [ ] Sound enabled for notification demo
- [ ] Recording software configured
- [ ] Script rehearsed
