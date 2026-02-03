#!/usr/bin/env bun
// Wallet transaction tracker - monitors Solana wallet and logs transfers/swaps
// Usage: SOLANA_RPC_URL=<url> bun run wallet-tracker.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';

const ACTIVITY_FILE = join(import.meta.dir, '../activity.json');
const STATE_FILE = join(import.meta.dir, 'wallet-state.json');
const WALLET = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';

// Known token mints
const TOKENS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'GdZ9rwHyKcriLdbSzhtEFLe5MLs7Vk6AY1aE5ei7nsmP': 'AVO',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
};

interface WalletState {
  lastSignature: string | null;
  lastCheck: string;
}

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  signature?: string;
  hash?: string;
}

function loadState(): WalletState {
  if (existsSync(STATE_FILE)) {
    return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  }
  return { lastSignature: null, lastCheck: new Date().toISOString() };
}

function saveState(state: WalletState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function loadActivities(): Activity[] {
  if (existsSync(ACTIVITY_FILE)) {
    return JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  }
  return [];
}

function saveActivities(activities: Activity[]) {
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
}

function parseTransaction(tx: ParsedTransactionWithMeta, signature: string): Activity | null {
  if (!tx.meta || tx.meta.err) return null;
  
  const timestamp = tx.blockTime 
    ? new Date(tx.blockTime * 1000).toISOString() 
    : new Date().toISOString();
  
  // Check for SOL transfers
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  const accounts = tx.transaction.message.accountKeys;
  
  const walletIndex = accounts.findIndex(a => a.pubkey.toBase58() === WALLET);
  if (walletIndex === -1) return null;
  
  const solChange = (postBalances[walletIndex] - preBalances[walletIndex]) / 1e9;
  
  // Check token balances
  const preTokens = tx.meta.preTokenBalances || [];
  const postTokens = tx.meta.postTokenBalances || [];
  
  // Find token changes for our wallet
  const tokenChanges: { token: string; amount: number }[] = [];
  
  for (const post of postTokens) {
    if (post.owner !== WALLET) continue;
    const pre = preTokens.find(p => p.mint === post.mint && p.owner === WALLET);
    const preAmount = pre ? parseFloat(pre.uiTokenAmount.uiAmountString || '0') : 0;
    const postAmount = parseFloat(post.uiTokenAmount.uiAmountString || '0');
    const change = postAmount - preAmount;
    if (Math.abs(change) > 0.0001) {
      tokenChanges.push({
        token: TOKENS[post.mint] || post.mint.slice(0, 8),
        amount: change
      });
    }
  }
  
  // Determine transaction type
  if (tokenChanges.length >= 2) {
    // Token-to-token swap
    const sold = tokenChanges.find(t => t.amount < 0);
    const bought = tokenChanges.find(t => t.amount > 0);
    if (sold && bought) {
      return {
        timestamp,
        type: 'trade',
        description: `Swapped ${Math.abs(sold.amount).toFixed(4)} ${sold.token} → ${bought.amount.toFixed(4)} ${bought.token}`,
        metadata: {
          txSignature: signature,
          from: { token: sold.token, amount: Math.abs(sold.amount) },
          to: { token: bought.token, amount: bought.amount }
        }
      };
    }
  } else if (tokenChanges.length === 1 && Math.abs(solChange) > 0.002) {
    // SOL <-> Token swap (SOL changed significantly + 1 token changed)
    const tokenChange = tokenChanges[0];
    if (solChange < -0.002 && tokenChange.amount > 0) {
      // SOL -> Token swap
      const solSpent = Math.abs(solChange);
      return {
        timestamp,
        type: 'trade',
        description: `Swapped ${solSpent.toFixed(4)} SOL → ${tokenChange.amount.toFixed(4)} ${tokenChange.token}`,
        metadata: {
          txSignature: signature,
          from: { token: 'SOL', amount: solSpent },
          to: { token: tokenChange.token, amount: tokenChange.amount }
        }
      };
    } else if (solChange > 0.002 && tokenChange.amount < 0) {
      // Token -> SOL swap
      const solReceived = solChange;
      return {
        timestamp,
        type: 'trade',
        description: `Swapped ${Math.abs(tokenChange.amount).toFixed(4)} ${tokenChange.token} → ${solReceived.toFixed(4)} SOL`,
        metadata: {
          txSignature: signature,
          from: { token: tokenChange.token, amount: Math.abs(tokenChange.amount) },
          to: { token: 'SOL', amount: solReceived }
        }
      };
    }
    // Fall through to regular transfer if not a swap pattern
    const direction = tokenChange.amount > 0 ? 'Received' : 'Sent';
    return {
      timestamp,
      type: 'transfer',
      description: `${direction} ${Math.abs(tokenChange.amount).toFixed(4)} ${tokenChange.token}`,
      metadata: {
        txSignature: signature,
        token: tokenChange.token,
        amount: tokenChange.amount
      }
    };
  } else if (tokenChanges.length === 1) {
    const change = tokenChanges[0];
    const direction = change.amount > 0 ? 'Received' : 'Sent';
    return {
      timestamp,
      type: 'transfer',
      description: `${direction} ${Math.abs(change.amount).toFixed(4)} ${change.token}`,
      metadata: {
        txSignature: signature,
        token: change.token,
        amount: change.amount
      }
    };
  } else if (Math.abs(solChange) > 0.001) {
    // SOL transfer (excluding small fee changes)
    const direction = solChange > 0 ? 'Received' : 'Sent';
    return {
      timestamp,
      type: 'transfer',
      description: `${direction} ${Math.abs(solChange).toFixed(4)} SOL`,
      metadata: {
        txSignature: signature,
        token: 'SOL',
        amount: solChange
      }
    };
  }
  
  return null;
}

async function main() {
  console.log(`\n🔍 Wallet Tracker - ${WALLET.slice(0, 8)}...`);
  
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  const state = loadState();
  const activities = loadActivities();
  
  console.log(`📅 Last check: ${state.lastCheck}`);
  console.log(`📝 Last signature: ${state.lastSignature?.slice(0, 16) || 'none'}...`);
  
  // Fetch recent signatures
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(WALLET),
    { 
      limit: 20,
      until: state.lastSignature || undefined
    }
  );
  
  if (signatures.length === 0) {
    console.log('✨ No new transactions');
    state.lastCheck = new Date().toISOString();
    saveState(state);
    return;
  }
  
  console.log(`🔎 Found ${signatures.length} new transactions`);
  
  // Process in reverse order (oldest first)
  const newActivities: Activity[] = [];
  
  for (const sig of signatures.reverse()) {
    // Skip if we've already processed this
    if (activities.some(a => a.metadata?.txSignature === sig.signature)) {
      continue;
    }
    
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx) continue;
      
      const activity = parseTransaction(tx, sig.signature);
      if (activity) {
        newActivities.push(activity);
        console.log(`✅ ${activity.type}: ${activity.description}`);
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 200));
    } catch (error: any) {
      console.error(`⚠️ Error parsing ${sig.signature.slice(0, 16)}: ${error.message}`);
    }
  }
  
  if (newActivities.length > 0) {
    // Append new activities
    activities.push(...newActivities);
    saveActivities(activities);
    console.log(`\n💾 Added ${newActivities.length} activities`);
  }
  
  // Update state
  state.lastSignature = signatures[0].signature;
  state.lastCheck = new Date().toISOString();
  saveState(state);
}

main().catch(console.error);
