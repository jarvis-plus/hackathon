#!/usr/bin/env bun
/**
 * Register Jarvis as an agent on the 8004 Agent Registry (Solana devnet)
 * 
 * Usage: bun run register-8004.ts
 * 
 * This registers Jarvis as an NFT-based agent identity on the 8004 protocol,
 * giving our Proof of Work project a standardized on-chain identity.
 */

import { SolanaSDK, buildRegistrationFileJson, ServiceType } from '8004-solana';
import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const KEYPAIR_PATH = '/root/clawd/jarvis-wallet.json';
const STATE_FILE = './data/8004-agent.json';

async function main() {
  // Load wallet
  const secretKey = Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, 'utf-8')));
  const signer = Keypair.fromSecretKey(secretKey);
  console.log('Wallet:', signer.publicKey.toBase58());

  // Check balance
  const conn = new Connection(DEVNET_RPC);
  const balance = await conn.getBalance(signer.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    console.error('Insufficient devnet SOL. Request an airdrop first.');
    process.exit(1);
  }

  // Check if already registered
  if (existsSync(STATE_FILE)) {
    const state = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    if (state.assetId) {
      console.log('Agent already registered!');
      console.log('Asset ID:', state.assetId);
      console.log('Registered at:', state.registeredAt);
      return state;
    }
  }

  // Initialize SDK
  const sdk = new SolanaSDK({ cluster: 'devnet', signer });

  // Build agent metadata
  const agentMeta = buildRegistrationFileJson({
    name: 'Jarvis',
    description: 'Autonomous AI agent with cryptographic proof of work. Every decision, code change, and interaction is hashed, signed, and recorded on Solana mainnet. Jarvis is a self-sovereign AI that proves its existence through verifiable on-chain activity logs.',
    services: [
      { type: ServiceType.A2A, value: 'https://jarvis.tail6a9bde.ts.net/api' },
    ],
    skills: [
      'advanced_reasoning_planning/advanced_reasoning_planning',
      'analytical_skills/coding_skills/code_optimization',
      'agent_orchestration/agent_orchestration',
    ],
    domains: [
      'technology/blockchain/blockchain',
      'technology/software_engineering/software_engineering',
    ],
  });

  console.log('Registering agent on 8004 registry...');
  
  // Save metadata to a publicly accessible file, then use that URL
  // The on-chain URI has a 250 byte limit, so we host it ourselves
  const metaJson = JSON.stringify(agentMeta, null, 2);
  writeFileSync('./public/8004-agent.json', metaJson);
  
  // Use a short URL - our dashboard or a raw GitHub gist
  // For now, write to public/ and use the Vercel deployment URL
  const metaUri = 'https://jarvis-pow.vercel.app/8004-agent.json';
  
  try {
    const result = await sdk.registerAgent(metaUri);
    
    const state = {
      assetId: result.asset.toBase58(),
      registeredAt: new Date().toISOString(),
      wallet: signer.publicKey.toBase58(),
      metadata: agentMeta,
      network: 'devnet',
      programId: '8oo48pya1SZD23ZhzoNMhxR2UGb8BRa41Su4qP9EuaWm',
    };

    writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    console.log('✅ Agent registered successfully!');
    console.log('Asset ID:', state.assetId);
    console.log('State saved to:', STATE_FILE);
    
    return state;
  } catch (err: any) {
    console.error('Registration failed:', err.message);
    
    // If it's a specific error, provide guidance
    if (err.message?.includes('insufficient')) {
      console.error('Need more devnet SOL. Try: bun -e "import {Connection,LAMPORTS_PER_SOL} from \'@solana/web3.js\'; const c = new Connection(\'https://api.devnet.solana.com\'); await c.requestAirdrop(new (await import(\'@solana/web3.js\')).PublicKey(\'AMqXw6BjW7eBWBXuyZgKaicvLF7AaVjrTfVg2JXon9zX\'), 2*LAMPORTS_PER_SOL)"');
    }
    
    throw err;
  }
}

main().catch(console.error);
