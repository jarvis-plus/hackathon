#!/bin/bash
# Cron runner for Jarvis Proof of Work
# Runs all collectors + auto-signer every 15 minutes
# Add to crontab: */15 * * * * /root/clawd/hackathon/proof-of-work/cron-runner.sh >> /var/log/jarvis-pow-cron.log 2>&1

cd /root/clawd/hackathon/proof-of-work

# Get Helius RPC URL from pass
export SOLANA_RPC_URL=$(pass helius/rpc-url 2>/dev/null || echo "https://api.mainnet-beta.solana.com")

echo "======================================"
echo "🕐 $(date '+%Y-%m-%d %H:%M:%S')"
echo "======================================"

# 1. Track wallet transactions
echo "📊 Checking wallet transactions..."
bun run collectors/wallet-tracker.ts

# 2. Track agent heartbeat/uptime
echo ""
echo "💓 Checking agent heartbeat..."
bun run collectors/heartbeat-tracker.ts

# 3. Track session activity
echo ""
echo "🔄 Checking session activity..."
bun run collectors/session-tracker.ts

# 4. Auto-sign any unsigned activities
echo ""
echo "🔐 Auto-signing activities..."
bun run auto-sign.ts

echo ""
echo "✅ Cron cycle complete"
