import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const keypair = new Ed25519Keypair();
const privateKey = keypair.export().privateKey;
const publicKey = keypair.getPublicKey().toBase64();
const address = keypair.getPublicKey().toSuiAddress();

console.log("✅ New Ed25519 Keypair Generated");
console.log("🔑 Private Key (Base64):", privateKey);
console.log("📮 Sui Address:", address);
console.log("🧷 Public Key (Base64):", publicKey);