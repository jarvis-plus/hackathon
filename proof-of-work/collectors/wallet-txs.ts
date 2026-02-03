#!/usr/bin/env bun
// Collect wallet transactions and add them to activity log
// Usage: SOLANA_RPC_URL=<url> bun run wallet-txs.ts

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Connection, PublicKey } from '@solana/web3.js';

const ACTIVITY_FILE = join(import.meta.dir, '..', 'activity.json');
const WALLET_ADDRESS = 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX';
const OWNER_IDENTITY = 'Paperhead'; // On-chain identity - never use real names

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  signature?: string;
  hash?: string;
}

// Known token mints for display
const TOKEN_NAMES: Record<string, string> = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'So11111111111111111111111111111111111111112': 'SOL',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
};

async function main() {
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  const wallet = new PublicKey(WALLET_ADDRESS);

  console.log(`🔍 Fetching transactions for ${OWNER_IDENTITY}'s wallet...`);
  console.log(`   Wallet: ${WALLET_ADDRESS}`);

  // Load existing activities
  let activities: Activity[] = [];
  if (existsSync(ACTIVITY_FILE)) {
    activities = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  }

  // Get existing tx signatures to avoid duplicates
  const existingTxs = new Set(
    activities
      .filter(a => a.metadata?.txSignature)
      .map(a => a.metadata!.txSignature)
  );

  // Fetch recent transactions
  const signatures = await connection.getSignaturesForAddress(wallet, { limit: 50 });
  console.log(`📋 Found ${signatures.length} recent transactions`);

  let newCount = 0;
  for (const sigInfo of signatures) {
    if (existingTxs.has(sigInfo.signature)) continue;

    // Get transaction details
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0
    });
    
    if (!tx) continue;

    const timestamp = new Date(sigInfo.blockTime! * 1000).toISOString();
    
    // Analyze transaction type
    let txType = 'transaction';
    let description = `Blockchain transaction`;
    const metadata: Record<string, any> = {
      txSignature: sigInfo.signature,
      slot: sigInfo.slot,
    };

    // Check for transfers
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if ('parsed' in ix) {
        const parsed = ix.parsed;
        if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
          txType = 'trade';
          const info = parsed.info;
          const amount = info.amount || info.lamports;
          const tokenName = info.mint ? (TOKEN_NAMES[info.mint] || 'TOKEN') : 'SOL';
          
          // Determine direction
          const isOutgoing = info.source === WALLET_ADDRESS || 
                            info.authority === WALLET_ADDRESS;
          
          description = isOutgoing 
            ? `Sent ${amount} ${tokenName}`
            : `Received ${amount} ${tokenName}`;
          
          metadata.amount = amount;
          metadata.token = tokenName;
          metadata.direction = isOutgoing ? 'out' : 'in';
          break;
        }
      }
    }

    // Check for swap (Jupiter, etc.)
    const accountKeys = tx.transaction.message.accountKeys.map(k => k.pubkey.toBase58());
    const jupiterProgram = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
    if (accountKeys.includes(jupiterProgram)) {
      txType = 'trade';
      description = `DEX swap executed`;
      metadata.protocol = 'Jupiter';
    }

    const activity: Activity = {
      timestamp,
      type: txType,
      description,
      metadata
    };

    activities.push(activity);
    newCount++;
    console.log(`  + ${txType}: ${description} (${sigInfo.signature.slice(0, 8)}...)`);
  }

  if (newCount > 0) {
    // Sort by timestamp
    activities.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
    console.log(`\n✅ Added ${newCount} new transactions to activity log`);
  } else {
    console.log('\n✨ No new transactions to add');
  }
}

main().catch(console.error);
