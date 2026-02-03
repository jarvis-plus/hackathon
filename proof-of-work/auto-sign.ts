#!/usr/bin/env bun
// Auto-sign script for cron - signs all unsigned activities with retry logic
// Usage: SOLANA_RPC_URL=<url> bun run auto-sign.ts
//        SOLANA_RPC_URL=<url> bun run auto-sign.ts --retry-failed

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
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
const FAILED_LOG = join(import.meta.dir, 'failed-signatures.log');
const WALLET_PATH = '/root/clawd/jarvis-wallet.json';
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const OWNER_IDENTITY = 'Paperhead';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;  // 1 second
const MAX_DELAY_MS = 10000;     // 10 seconds
const BACKOFF_MULTIPLIER = 2;

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  signature?: string;
  hash?: string;
  signError?: string;      // Track last error if signing failed
  signAttempts?: number;   // Track retry attempts
}

interface SignResult {
  success: boolean;
  signature?: string;
  error?: string;
  attempts: number;
  isRetryable: boolean;
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

// Determine if an error is transient (worth retrying) or permanent
function isRetryableError(error: any): boolean {
  const message = error?.message?.toLowerCase() || '';
  const logs = error?.logs?.join(' ').toLowerCase() || '';
  
  // Transient errors worth retrying
  const retryablePatterns = [
    'timeout',
    'network',
    'connection',
    'econnreset',
    'econnrefused',
    'blockhash not found',
    'blockhash expired',
    'too many requests',
    'rate limit',
    '429',
    '503',
    '502',
    'temporarily unavailable',
    'try again'
  ];
  
  // Permanent errors - don't retry
  const permanentPatterns = [
    'insufficient funds',
    'insufficient lamports',
    'invalid signature',
    'invalid account',
    'program failed',
    'custom program error'
  ];
  
  // Check for permanent errors first
  for (const pattern of permanentPatterns) {
    if (message.includes(pattern) || logs.includes(pattern)) {
      return false;
    }
  }
  
  // Check for retryable errors
  for (const pattern of retryablePatterns) {
    if (message.includes(pattern) || logs.includes(pattern)) {
      return true;
    }
  }
  
  // Default: retry unknown errors (network issues often have unclear messages)
  return true;
}

// Sleep utility with jitter for better distributed retries
function sleep(ms: number): Promise<void> {
  const jitter = Math.random() * 200; // 0-200ms jitter
  return new Promise(r => setTimeout(r, ms + jitter));
}

// Calculate delay with exponential backoff
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_DELAY_MS * Math.pow(BACKOFF_MULTIPLIER, attempt - 1);
  return Math.min(delay, MAX_DELAY_MS);
}

async function signActivityWithRetry(
  connection: Connection,
  payer: Keypair,
  activity: Activity,
  index: number
): Promise<SignResult> {
  const hash = hashActivity(activity);
  const memo = `JARVIS_POW|${OWNER_IDENTITY}|${index}|${activity.type}|${hash}`;
  
  let lastError: any = null;
  let attempts = 0;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    attempts = attempt;
    
    try {
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
        { 
          commitment: 'confirmed',
          maxRetries: 2  // Internal Solana SDK retries
        }
      );

      return { 
        success: true, 
        signature, 
        attempts,
        isRetryable: false 
      };
      
    } catch (error: any) {
      lastError = error;
      const retryable = isRetryableError(error);
      
      if (!retryable) {
        // Permanent error - don't retry
        console.error(`   ⛔ Permanent error (attempt ${attempt}): ${error.message}`);
        return {
          success: false,
          error: error.message,
          attempts,
          isRetryable: false
        };
      }
      
      if (attempt < MAX_RETRIES) {
        const delay = getRetryDelay(attempt);
        console.log(`   ⚠️  Attempt ${attempt} failed (${error.message}), retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All retries exhausted
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    attempts,
    isRetryable: true  // Could potentially succeed later
  };
}

function logFailure(index: number, activity: Activity, error: string) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    index,
    type: activity.type,
    error,
    activityTimestamp: activity.timestamp
  });
  appendFileSync(FAILED_LOG, entry + '\n');
}

async function main() {
  const args = process.argv.slice(2);
  const retryFailed = args.includes('--retry-failed');
  
  const startTime = new Date().toISOString();
  console.log(`\n🕐 Auto-sign started at ${startTime}`);
  console.log(`   Retry config: ${MAX_RETRIES} attempts, ${INITIAL_DELAY_MS}ms initial delay, ${BACKOFF_MULTIPLIER}x backoff`);

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
  console.log(`🌐 RPC: ${rpcUrl.includes('helius') ? 'Helius' : rpcUrl.slice(0, 40)}...`);
  
  const activities: Activity[] = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  
  // Find activities to sign
  let toSign = activities
    .map((a, i) => ({ activity: a, index: i }))
    .filter(({ activity }) => !activity.signature);

  // Optionally prioritize previously failed activities
  if (retryFailed) {
    const previouslyFailed = toSign.filter(({ activity }) => activity.signError);
    if (previouslyFailed.length > 0) {
      console.log(`🔄 Retrying ${previouslyFailed.length} previously failed activities first`);
      // Put failed ones first
      const notFailed = toSign.filter(({ activity }) => !activity.signError);
      toSign = [...previouslyFailed, ...notFailed];
    }
  }

  if (toSign.length === 0) {
    console.log('✨ All activities already signed');
    return;
  }

  console.log(`📝 Found ${toSign.length} unsigned activities\n`);

  let signed = 0;
  let failed = 0;
  let retryable = 0;

  for (const { activity, index } of toSign) {
    console.log(`[${index}] ${activity.type}: ${activity.description.slice(0, 50)}...`);
    
    const result = await signActivityWithRetry(connection, payer, activity, index);
    
    if (result.success && result.signature) {
      activities[index].hash = hashActivity(activity);
      activities[index].signature = result.signature;
      delete activities[index].signError;
      delete activities[index].signAttempts;
      signed++;
      
      console.log(`   ✅ Signed (attempt ${result.attempts}): ${result.signature.slice(0, 20)}...`);
    } else {
      // Track failure in activity
      activities[index].signError = result.error;
      activities[index].signAttempts = (activities[index].signAttempts || 0) + result.attempts;
      
      if (result.isRetryable) {
        retryable++;
        console.log(`   ❌ Failed after ${result.attempts} attempts (retryable): ${result.error}`);
      } else {
        failed++;
        console.log(`   ⛔ Failed permanently: ${result.error}`);
        logFailure(index, activity, result.error || 'Unknown');
      }
    }
    
    // Delay between activities (even successful ones) to avoid rate limits
    await sleep(500);
  }

  // Save updated activities (including error tracking)
  writeFileSync(ACTIVITY_FILE, JSON.stringify(activities, null, 2));
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`   ✅ Signed: ${signed}`);
  if (failed > 0) console.log(`   ⛔ Permanent failures: ${failed}`);
  if (retryable > 0) console.log(`   ⚠️  Retryable failures: ${retryable} (will retry next run)`);
  console.log(`   📋 Total unsigned remaining: ${toSign.length - signed}`);
  
  // Exit with error code if there were permanent failures
  if (failed > 0) {
    process.exit(2);  // Indicates permanent failures
  }
}

main().catch(console.error);
