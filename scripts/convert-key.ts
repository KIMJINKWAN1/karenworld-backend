import 'dotenv/config';
import { decode, fromWords } from 'bech32';
import { Buffer } from 'buffer';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const suiprivkey = process.env.PRIVATE_KEY;

if (!suiprivkey) {
  throw new Error('PRIVATE_KEY is not defined in .env');
}

try {
  const { prefix, words } = decode(suiprivkey);
  if (prefix !== 'suiprivkey') throw new Error('Invalid prefix');

  const fullBytes = Buffer.from(fromWords(words)); // 33 bytes
  if (fullBytes.length !== 33 || fullBytes[0] !== 0x00) {
    throw new Error('Invalid secret key format');
  }

  const secretKey = fullBytes.slice(1);

  const keypair = Ed25519Keypair.fromSecretKey(secretKey);

  console.log('Base64 PRIVATE_KEY:', fullBytes.toString('base64'));
  console.log('Sui Address:', keypair.getPublicKey().toSuiAddress());
} catch (err) {
  console.error('Error:', err);
}