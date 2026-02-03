#!/usr/bin/env bun
// Auto-sign script for cron - signs all unsigned activities
// Usage: SOLANA_RPC_URL=<url> bun run auto-sign.ts

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
const OWNER_IDENTITY = 'Paperhead';

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  signature?: string;
  hash?: string;
}

function hashActivity(activity: Activity): string {
  const content = {
    owner: OWNER_IDENTITY,
    timestamp: activity.timestamp,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata || {}
  };
  return createHash('sha256').update(JSON.stringify(content)).digest('hex');
}

async function signActivity(
  connection: Connection,
  payer: Keypair,
  activity: Activity,
  index: number
): Promise<string> {
  const hash = hashActivity(activity);
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

  return signature;
}

async function main() {
  const startTime = new Date().toISOString();
  console.log(`\n🕐 Auto-sign started at ${startTime}`);

  // Check wallet exists
  if (!existsSync(WALLET_PATH)) {
    console.error('❌ Wallet not found');
    process.exit(1);
  }

  // Check activities exist
  if (!existsSync(ACTIVITY_FILE)) {
    console.log('📋 No activities file yet');
    process.exit(0);
  }

  const walletData = JSON.parse(readFileSync(WALLET_PATH, 'utf-8'));
  const payer = Keypair.fromSecretKey(Uint8Array.from(walletData));
  
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  const activities: Activity[] = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  
  // Find unsigned activities
  const unsigned = activities
    .map((a, i) => ({ activity: a, index: i }))
    .filter(({ activity }) => !activity.signature);

  if (unsigned.length === 0) {
    console.log('✨ All activities already signed');
    return;
  }

  console.log(`📝 Found ${unsigned.length} unsigned activities`);

  let signed = 0;
  for (const { activity, index } of unsigned) {
    try {
      const hash = hashActivity(activity);
      const signature = await signActivity(connection, payer, activity, index);
      
      activities[index].hash = hash;
      activities[index].signature = signature;
      signed++;
      
      console.log(`✅ [${index}] ${activity.type}: ${signature.slice(0, 16)}...`);
      
      // Small delay between transactions
      await new Promise(r => setTimeout(r, 500));
    } catch (error: any) {
      console.error(`❌ [${index}] Failed: ${error.message}`);
    }
  }

  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  console.log(`\n💾 Signed ${signed}/${unsigned.length} activities`);
}

main().catch(console.error);
