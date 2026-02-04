#!/usr/bin/env bun
/**
 * Recurring Trade Executor
 * 
 * Executes small, periodic trades to generate authentic on-chain proof
 * of trading activity. Designed for DCA-style micro-swaps.
 * 
 * Usage:
 *   bun run collectors/recurring-trade.ts --from SOL --to USDC --amount 0.001
 *   bun run collectors/recurring-trade.ts --dry-run
 *   bun run collectors/recurring-trade.ts --help
 */

import { execSync } from "child_process";
import { dirname, join } from "path";
import {
  type TradeState,
  loadState as loadGenericState,
  saveState as saveGenericState,
} from './types.js';

const PROOF_DIR = dirname(__dirname);
const STATE_FILE = join(PROOF_DIR, "recurring-trade-state.json");
const SCRIPTS_DIR = "/root/clawd/scripts";

const DEFAULT_STATE: TradeState = {
  lastTradeTimestamp: null,
  totalTrades: 0,
  totalVolumeSOL: 0,
  totalVolumeUSDC: 0,
  history: [],
};

function loadState(): TradeState {
  return loadGenericState(STATE_FILE, DEFAULT_STATE);
}

function saveState(state: TradeState): void {
  saveGenericState(STATE_FILE, state);
}

function getEnvRPC(): string {
  const rpc = process.env.SOLANA_RPC_URL;
  if (!rpc) {
    // Try to get from pass
    try {
      const heliusRpc = execSync("pass solana/helius-rpc-url 2>/dev/null", { encoding: "utf-8" }).trim();
      if (heliusRpc) return heliusRpc;
    } catch {}
    throw new Error("SOLANA_RPC_URL not set and couldn't get Helius RPC from pass");
  }
  return rpc;
}

async function executeTrade(from: string, to: string, amount: number, dryRun: boolean): Promise<string | null> {
  const rpc = getEnvRPC();
  
  console.log(`\n🔄 Executing trade: ${amount} ${from} → ${to}`);
  
  if (dryRun) {
    console.log("   [DRY RUN] Would execute swap via dflow-swap.ts");
    return null;
  }
  
  try {
    const cmd = `SOLANA_RPC_URL="${rpc}" bun run ${SCRIPTS_DIR}/dflow-swap.ts ${from} ${to} ${amount}`;
    const output = execSync(cmd, { encoding: "utf-8", timeout: 120000 });
    
    // Extract tx signature from output (solscan URL format)
    const txMatch = output.match(/solscan\.io\/tx\/([A-Za-z0-9]+)/);
    if (txMatch) {
      console.log(`   ✅ Trade successful: ${txMatch[1].slice(0, 12)}...`);
      return txMatch[1];
    }
    
    // Check for successful swap message
    if (output.includes("Swap complete") || output.includes("Swap successful") || output.includes("executed")) {
      console.log("   ✅ Trade completed (no tx signature in output)");
      return "completed";
    }
    
    console.log("   ⚠️ Trade output:", output.slice(0, 200));
    return null;
  } catch (error: any) {
    console.error(`   ❌ Trade failed: ${error.message}`);
    return null;
  }
}

async function logTradeActivity(from: string, to: string, amount: number, txSignature: string | null) {
  // Log to activity feed via log.ts
  const logScript = join(PROOF_DIR, "log.ts");
  const description = txSignature 
    ? `DCA trade: ${amount} ${from} → ${to}`
    : `DCA trade attempted: ${amount} ${from} → ${to} (pending)`;
  
  const metadata = {
    from: { token: from, amount },
    to: { token: to },
    txSignature: txSignature || undefined,
    source: "recurring-trade",
    cycle: "auto"
  };
  
  try {
    execSync(`bun run ${logScript} trade "${description}" '${JSON.stringify(metadata)}'`, {
      cwd: PROOF_DIR,
      encoding: "utf-8"
    });
    console.log("   📝 Logged to activity feed");
  } catch (e) {
    console.error("   ⚠️ Failed to log activity");
  }
}

function printHelp() {
  console.log(`
Recurring Trade Executor - DCA-style micro-trades for on-chain proof

Usage:
  bun run collectors/recurring-trade.ts [options]

Options:
  --from TOKEN     Source token (default: SOL)
  --to TOKEN       Destination token (default: USDC)
  --amount NUM     Amount to trade (default: 0.001)
  --dry-run        Simulate without executing
  --status         Show trade history and stats
  --help           Show this help

Examples:
  # Execute a 0.001 SOL → USDC trade
  bun run collectors/recurring-trade.ts --from SOL --to USDC --amount 0.001

  # Dry run to test
  bun run collectors/recurring-trade.ts --dry-run

  # Check status
  bun run collectors/recurring-trade.ts --status
`);
}

function printStatus() {
  const state = loadState();
  console.log("\n📊 Recurring Trade Status");
  console.log("─".repeat(40));
  console.log(`Total trades: ${state.totalTrades}`);
  console.log(`Total SOL volume: ${state.totalVolumeSOL.toFixed(6)} SOL`);
  console.log(`Total USDC volume: ${state.totalVolumeUSDC.toFixed(4)} USDC`);
  console.log(`Last trade: ${state.lastTradeTimestamp || "Never"}`);
  
  if (state.history.length > 0) {
    console.log("\n📜 Recent trades:");
    state.history.slice(-5).forEach(t => {
      const tx = t.txSignature ? t.txSignature.slice(0, 12) + "..." : "pending";
      console.log(`  ${t.timestamp}: ${t.amount} ${t.from} → ${t.to} (${tx})`);
    });
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  
  if (args.includes("--status")) {
    printStatus();
    return;
  }
  
  // Parse arguments
  const fromIdx = args.indexOf("--from");
  const toIdx = args.indexOf("--to");
  const amountIdx = args.indexOf("--amount");
  const dryRun = args.includes("--dry-run");
  
  const from = fromIdx >= 0 ? args[fromIdx + 1] : "SOL";
  const to = toIdx >= 0 ? args[toIdx + 1] : "USDC";
  const amount = amountIdx >= 0 ? parseFloat(args[amountIdx + 1]) : 0.001;
  
  console.log("🔄 Recurring Trade Executor");
  console.log("─".repeat(40));
  console.log(`From: ${from}`);
  console.log(`To: ${to}`);
  console.log(`Amount: ${amount}`);
  console.log(`Dry run: ${dryRun}`);
  
  // Execute trade
  const txSignature = await executeTrade(from, to, amount, dryRun);
  
  if (!dryRun) {
    // Update state
    const state = loadState();
    state.lastTradeTimestamp = new Date().toISOString();
    state.totalTrades++;
    
    if (from === "SOL") state.totalVolumeSOL += amount;
    if (to === "SOL") state.totalVolumeSOL += amount;
    if (from === "USDC") state.totalVolumeUSDC += amount;
    if (to === "USDC") state.totalVolumeUSDC += amount;
    
    state.history.push({
      timestamp: state.lastTradeTimestamp,
      from,
      to,
      amount,
      txSignature: txSignature || undefined
    });
    
    // Keep only last 50 trades in history
    if (state.history.length > 50) {
      state.history = state.history.slice(-50);
    }
    
    saveState(state);
    
    // Log activity
    await logTradeActivity(from, to, amount, txSignature);
  }
  
  console.log("\n✅ Done");
}

main().catch(console.error);
