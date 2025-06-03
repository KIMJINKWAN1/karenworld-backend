import 'dotenv/config';
import { mnemonicToSeedSync } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { derivePath } from 'ed25519-hd-key';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const mnemonic = process.env.MNEMONIC!;
if (!mnemonic) throw new Error('❌ MNEMONIC 환경변수가 설정되지 않았습니다.');

const seed = mnemonicToSeedSync(mnemonic, wordlist);
const derived = derivePath("m/44'/784'/0'/0'/0'", seed);

const keypair = Ed25519Keypair.fromSecretKey(derived.key);
const address = keypair.getPublicKey().toSuiAddress();

console.log('✅ 니모닉 기반 Sui 주소:', address);