import 'dotenv/config';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/bcs';

const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error('❌ PRIVATE_KEY not found in .env');
}

const secretKey = fromB64(PRIVATE_KEY).slice(1); // 첫 바이트 제거
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const publicAddress = keypair.getPublicKey().toSuiAddress();

console.log('✅ Derived address from PRIVATE_KEY:', publicAddress);