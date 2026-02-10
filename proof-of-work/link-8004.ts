#!/usr/bin/env bun
/**
 * Submit Proof of Work activity summaries as feedback to the 8004 Agent Registry
 * 
 * Usage: bun run link-8004.ts [--latest | --all-unsigned]
 * 
 * This bridges our PoW activity logs to the 8004 reputation system,
 * submitting activity counts and summaries as on-chain feedback.
 */

import { SolanaSDK, Tag } from '8004-solana';
import { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const KEYPAIR_PATH = '/root/clawd/jarvis-wallet.json';
const STATE_FILE = './data/8004-agent.json';
const ACTIVITY_FILE = './activity.json';
const LINK_STATE_FILE = './data/8004-link-state.json';

interface Activity {
  timestamp: string;
  type: string;
  description: string;
  hash?: string;
  signature?: string;
  onChain?: boolean;
}

function loadLinkState(): { lastLinkedIndex: number; feedbackTxs: string[] } {
  if (existsSync(LINK_STATE_FILE)) {
    return JSON.parse(readFileSync(LINK_STATE_FILE, 'utf-8'));
  }
  return { lastLinkedIndex: -1, feedbackTxs: [] };
}

function saveLinkState(state: any) {
  writeFileSync(LINK_STATE_FILE, JSON.stringify(state, null, 2));
}

async function main() {
  // Load agent state
  if (!existsSync(STATE_FILE)) {
    console.error('Agent not registered. Run register-8004.ts first.');
    process.exit(1);
  }
  const agentState = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
  const assetId = new PublicKey(agentState.assetId);
  console.log('Agent Asset:', assetId.toBase58());

  // Load wallet
  const secretKey = Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, 'utf-8')));
  const signer = Keypair.fromSecretKey(secretKey);

  // Check balance
  const conn = new Connection(DEVNET_RPC);
  const balance = await conn.getBalance(signer.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.error('Insufficient devnet SOL for feedback transaction.');
    process.exit(1);
  }

  // Load activities
  const activities: Activity[] = JSON.parse(readFileSync(ACTIVITY_FILE, 'utf-8'));
  const onChainActivities = activities.filter(a => a.onChain);
  
  // Load link state
  const linkState = loadLinkState();
  const newActivities = activities.slice(linkState.lastLinkedIndex + 1);
  
  if (newActivities.length === 0) {
    console.log('No new activities to link.');
    return;
  }

  console.log(`Found ${newActivities.length} new activities to submit as feedback`);

  // Initialize SDK
  const sdk = new SolanaSDK({ cluster: 'devnet', signer });

  // Create a summary of new activities
  const summary = {
    period: {
      from: newActivities[0]?.timestamp,
      to: newActivities[newActivities.length - 1]?.timestamp,
    },
    totalActivities: newActivities.length,
    onChainSigned: newActivities.filter(a => a.onChain).length,
    types: Object.entries(
      newActivities.reduce((acc: Record<string, number>, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {})
    ).map(([type, count]) => ({ type, count })),
    powWallet: signer.publicKey.toBase58(),
    network: 'mainnet-beta',
  };

  // Save summary as feedback file
  const summaryJson = JSON.stringify(summary, null, 2);
  const summaryHash = createHash('sha256').update(summaryJson).digest();
  writeFileSync('./data/8004-latest-feedback.json', summaryJson);

  // Host feedback data at a URL (save to public for Vercel deployment)
  writeFileSync('./public/8004-feedback.json', summaryJson);
  const feedbackUri = 'https://jarvis-pow.vercel.app/8004-feedback.json';

  // Submit feedback: activity count as value
  console.log('Submitting feedback to 8004 registry...');
  console.log('Summary:', JSON.stringify(summary, null, 2));

  // NOTE: 8004 protocol doesn't allow self-feedback (agent owner can't rate their own agent)
  // This feedback must come from a different wallet (e.g., a user or validator)
  // For demo purposes, we'll use the sign+verify flow instead to prove activity
  console.log('\n⚠️  Self-feedback not allowed by 8004 protocol (anti-gaming measure)');
  console.log('Using sign+verify flow to cryptographically prove activity...\n');

  try {
    // Sign the activity summary with our agent's operational wallet
    const signed = sdk.sign(assetId, {
      action: 'proof-of-work-summary',
      totalActivities: newActivities.length,
      onChainSigned: newActivities.filter(a => a.onChain).length,
      period: summary.period,
      types: summary.types,
      powWallet: summary.powWallet,
    });

    console.log('✅ Activity summary signed with 8004 agent identity!');
    console.log('Signed payload:', JSON.stringify(signed, null, 2));
    
    // Save signed proof
    writeFileSync('./data/8004-signed-proof.json', JSON.stringify(signed, null, 2));
    writeFileSync('./public/8004-signed-proof.json', JSON.stringify(signed, null, 2));

    const result = { signature: signed.sig, success: true };

    // Update link state
    linkState.lastLinkedIndex = activities.length - 1;
    linkState.feedbackTxs.push({
      timestamp: new Date().toISOString(),
      activitiesCount: newActivities.length,
      summary,
    } as any);
    saveLinkState(linkState);

  } catch (err: any) {
    console.error('Feedback submission failed:', err.message);
    throw err;
  }

  // Verify the signed proof on-chain
  try {
    const signedProof = JSON.parse(readFileSync('./data/8004-signed-proof.json', 'utf-8'));
    const isValid = await sdk.verify(signedProof, assetId);
    console.log(`\n🔐 Signature verification: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  } catch (err: any) {
    console.log('Verification check:', err.message);
  }

  // Check agent info
  try {
    const agent = await sdk.loadAgent(assetId);
    console.log('\n📊 Agent Info:');
    console.log('  Name:', agent?.name || 'Jarvis');
    console.log('  Asset:', assetId.toBase58());
    console.log('  Owner:', signer.publicKey.toBase58());
  } catch (err: any) {
    console.log('Could not load agent:', err.message);
  }
}

main().catch(console.error);
