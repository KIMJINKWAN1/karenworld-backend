import 'dotenv/config';
import { mnemonicToSeedSync } from 'bip39';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const MNEMONIC = process.env.SUI_MNEMONIC!;
if (!MNEMONIC) throw new Error('❌ SUI_MNEMONIC is missing or not loaded');

const seed = mnemonicToSeedSync(MNEMONIC);
const keypair = Ed25519Keypair.fromSecretKey(seed.slice(0, 32));

console.log('🔑 Derived address:', keypair.getPublicKey().toSuiAddress());
