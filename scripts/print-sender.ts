import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import * as dotenv from 'dotenv';

dotenv.config();

try {
  const privKey = process.env.PRIVATE_KEY!;
  const parsed = decodeSuiPrivateKey(privKey); // => { schema, secretKey }
  const keypair = Ed25519Keypair.fromSecretKey(parsed.secretKey);
  const publicKey = keypair.getPublicKey();
  const address = publicKey.toSuiAddress();

  console.log(`✅ Sender address: ${address}`);
} catch (err) {
  console.error('❌ Failed to parse PRIVATE_KEY or derive address:', err);
}