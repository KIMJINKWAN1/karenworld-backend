import { fromB64 } from '@mysten/bcs';
import { mnemonicToSeedSync } from 'bip39';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const MNEMONIC = 'fan multiply core human empower hotel coffee tuition elite quit crystal palace';

const seed = mnemonicToSeedSync(MNEMONIC).slice(0, 32);
const keypair = Ed25519Keypair.fromSecretKey(seed);

console.log('✅ Derived Sui address:', keypair.getPublicKey().toSuiAddress());