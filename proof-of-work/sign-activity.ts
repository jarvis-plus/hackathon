#!/usr/bin/env bun
// Sign activities on-chain using Solana memo program
// Usage: bun run sign-activity.ts [--all | --index N] [--wallet NAME]
//
// Multi-wallet support:
//   --wallet jarvis    Use Jarvis wallet (default)
//   --wallet <path>    Use wallet at custom path
//   --list-wallets     Show configured wallets

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { 
  Connection, 
  Keypair, 
  Transaction, 
  TransactionInstruction,
  PublicKey,
  sendAndConfirmTransaction
} from '@solana/web3.js';

const ACTIVITY_FILE = join(import.meta.dir, 'activity.json');
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// ============================================================================
// MULTI-WALLET CONFIGURATION
// ============================================================================

/**
 * Configured wallets for multi-wallet support.
 * Add new wallets here with a friendly name and file path.
 */
const WALLET_CONFIG: Record<string, { path: string; address?: string }> = {
  jarvis: {
    path: '/root/clawd/jarvis-wallet.json',
    address: 'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX'
  },
  // Add additional wallets here:
  // agent2: { path: '/path/to/wallet2.json' },
  // trading: { path: '/path/to/trading-wallet.json' },
};

/** Default wallet name */
const DEFAULT_WALLET = 'jarvis';

/**
 * Resolve wallet path from name or path argument
 */
function resolveWalletPath(walletArg: string | null): string {
  if (!walletArg) {
    return WALLET_CONFIG[DEFAULT_WALLET].path;
  }
  
  // Check if it's a configured wallet name
  if (WALLET_CONFIG[walletArg]) {
    return WALLET_CONFIG[walletArg].path;
  }
  
  // Otherwise treat as file path
  return walletArg;
}

/**
 * List configured wallets
 */
function listWallets(): void {
  console.log('📋 Configured Wallets:\n');
  for (const [name, config] of Object.entries(WALLET_CONFIG)) {
    const isDefault = name === DEFAULT_WALLET ? ' (default)' : '';
    const exists = existsSync(config.path) ? '✅' : '❌';
    console.log(`  ${exists} ${name}${isDefault}`);
    console.log(`     Path: ${config.path}`);
    if (config.address) {
      console.log(`     Address: ${config.address}`);
    }
    console.log('');
  }
}

// Owner identity for on-chain records - NEVER use real names
const OWNER_IDENTITY = 'Paperhead';

export interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  tags?: string[];
  wallet?: string;     // Wallet address that signed this activity
  signature?: string;  // Solana tx signature
  hash?: string;       // SHA256 hash of activity
}

export function hashActivity(activity: Activity): string {
  // Create deterministic hash of activity content (excluding signature fields)
  const content = {
    owner: OWNER_IDENTITY,
    timestamp: activity.timestamp,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata || {}
  };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

async function signAndPostActivity(
  connection: Connection,
  payer: Keypair,
  activity: Activity,
  index: number
): Promise<string> {
  const hash = hashActivity(activity);
  
  // Create memo with activity proof
  // Format: JARVIS_POW|<owner>|<index>|<type>|<hash>
  const memo = `JARVIS_POW|${OWNER_IDENTITY}|${index}|${activity.type}|${hash}`;
  
  const instruction = new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, 'utf-8')
  });

  const transaction = new Transaction().add(instruction);
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer],
    { commitment: 'confirmed' }
  );

  console.log(`✅ Activity ${index} signed: ${signature}`);
  console.log(`   Hash: ${hash}`);
  console.log(`   Memo: ${memo}`);
  
  return signature;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Handle --list-wallets
  if (args.includes('--list-wallets')) {
    listWallets();
    return;
  }
  
  const signAll = args.includes('--all');
  const indexArg = args.indexOf('--index');
  const specificIndex = indexArg !== -1 ? parseInt(args[indexArg + 1]) : null;
  
  // Parse --wallet argument
  const walletArg = args.indexOf('--wallet');
  const walletName = walletArg !== -1 ? args[walletArg + 1] : null;
  const walletPath = resolveWalletPath(walletName);

  // Load wallet
  if (!existsSync(walletPath)) {
    console.error(`❌ Wallet not found at ${walletPath}`);
    if (walletName && !WALLET_CONFIG[walletName]) {
      console.error(`   (treating "${walletName}" as file path since it's not a configured wallet)`);
    }
    console.error('\nRun with --list-wallets to see configured wallets');
    process.exit(1);
  }
  const walletData = JSON.parse(readFileSync(walletPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletData));
  const walletDisplayName = walletName && WALLET_CONFIG[walletName] ? walletName : 'custom';
  console.log(`🔑 Using wallet [${walletDisplayName}]: ${payer.publicKey.toBase58()}`);

  // Connect to Solana
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`🌐 Connected to: ${rpcUrl.includes('helius') ? 'Helius RPC' : rpcUrl}`);

  // Load activities
  if (!existsSync(ACTIVITY_FILE)) {
    console.error('❌ No activities found');
    process.exit(1);
  }
  const activities: Activity[] = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  console.log(`📋 Found ${activities.length} activities\n`);

  // Determine which activities to sign
  let toSign: { activity: Activity; index: number }[] = [];
  
  if (specificIndex !== null) {
    if (specificIndex < 0 || specificIndex >= activities.length) {
      console.error(`❌ Invalid index: ${specificIndex}`);
      process.exit(1);
    }
    toSign = [{ activity: activities[specificIndex], index: specificIndex }];
  } else if (signAll) {
    // Sign all unsigned activities
    toSign = activities
      .map((a, i) => ({ activity: a, index: i }))
      .filter(({ activity }) => !activity.signature);
  } else {
    // Default: sign only the latest unsigned activity
    const lastUnsigned = activities
      .map((a, i) => ({ activity: a, index: i }))
      .filter(({ activity }) => !activity.signature)
      .pop();
    if (lastUnsigned) toSign = [lastUnsigned];
  }

  if (toSign.length === 0) {
    console.log('✨ All activities already signed!');
    return;
  }

  console.log(`📝 Signing ${toSign.length} activities...\n`);

  // Get wallet address for multi-wallet support
  const walletAddress = payer.publicKey.toBase58();
  
  // Sign each activity
  for (const { activity, index } of toSign) {
    try {
      const hash = hashActivity(activity);
      const signature = await signAndPostActivity(connection, payer, activity, index);
      
      // Update activity with signature and wallet
      activities[index].hash = hash;
      activities[index].signature = signature;
      activities[index].wallet = walletAddress;
    } catch (error: any) {
      console.error(`❌ Failed to sign activity ${index}:`, error.message);
    }
  }

  // Save updated activities
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  console.log('\n💾 Activities updated with signatures');
}

main().catch(console.error);
