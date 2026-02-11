#!/bin/bash
# Cron runner for Jarvis Proof of Work
# Runs all collectors + auto-signer every 15 minutes
# Add to crontab: */15 * * * * /root/clawd/hackathon/proof-of-work/cron-runner.sh >> /var/log/jarvis-pow-cron.log 2>&1

cd /root/clawd/hackathon/proof-of-work
export PATH="/root/.bun/bin:/home/linuxbrew/.linuxbrew/bin:$PATH"

# Get Helius RPC URL from pass
export SOLANA_RPC_URL=$(pass solana/helius-rpc-url 2>/dev/null || echo "https://api.mainnet-beta.solana.com")

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

# 4. Track sent emails
echo ""
echo "📧 Checking sent emails..."
bun run collectors/email-tracker.ts

# 5. Track browser activity
echo ""
echo "🌐 Checking browser activity..."
bun run collectors/browser-tracker.ts

# 6. Track calendar events
echo ""
echo "📅 Checking calendar events..."
bun run collectors/calendar-tracker.ts

# 7. Execute recurring micro-trade (every ~2 hours to preserve SOL)
# Check if enough time has passed since last trade
LAST_TRADE_FILE="/tmp/jarvis-last-dca-trade"
TRADE_INTERVAL=7200  # 2 hours in seconds
NOW=$(date +%s)

if [ -f "$LAST_TRADE_FILE" ]; then
  LAST_TRADE=$(cat "$LAST_TRADE_FILE")
  ELAPSED=$((NOW - LAST_TRADE))
else
  ELAPSED=$TRADE_INTERVAL  # Force first trade
fi

if [ $ELAPSED -ge $TRADE_INTERVAL ]; then
  echo ""
  echo "💱 Executing recurring micro-trade (every 2h)..."
  bun run collectors/recurring-trade.ts --from SOL --to USDC --amount 0.001
  echo $NOW > "$LAST_TRADE_FILE"
else
  REMAINING=$(((TRADE_INTERVAL - ELAPSED) / 60))
  echo ""
  echo "💱 Skipping trade (next in ~${REMAINING}m)"
fi

# 5. Auto-sign any unsigned activities
echo ""
echo "🔐 Auto-signing activities..."
bun run auto-sign.ts

echo ""
echo "✅ Cron cycle complete"
