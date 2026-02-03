#!/usr/bin/env bun
// Sign activities on-chain using Solana memo program
// Usage: bun run sign-activity.ts [--all | --index N]

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
const WALLET_PATH = '/root/clawd/jarvis-wallet.json';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

// Owner identity for on-chain records - NEVER use real names
const OWNER_IDENTITY = 'Paperhead';

export interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
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
  const signAll = args.includes('--all');
  const indexArg = args.indexOf('--index');
  const specificIndex = indexArg !== -1 ? parseInt(args[indexArg + 1]) : null;

  // Load wallet
  if (!existsSync(WALLET_PATH)) {
    console.error('❌ Wallet not found at', WALLET_PATH);
    process.exit(1);
  }
  const walletData = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletData));
  console.log(`🔑 Using wallet: ${payer.publicKey.toBase58()}`);

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

  // Sign each activity
  for (const { activity, index } of toSign) {
    try {
      const hash = hashActivity(activity);
      const signature = await signAndPostActivity(connection, payer, activity, index);
      
      // Update activity with signature
      activities[index].hash = hash;
      activities[index].signature = signature;
    } catch (error: any) {
      console.error(`❌ Failed to sign activity ${index}:`, error.message);
    }
  }

  // Save updated activities
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  console.log('\n💾 Activities updated with signatures');
}

main().catch(console.error);
