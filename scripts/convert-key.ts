import { wordlist } from '@scure/bip39/wordlists/english';
import { mnemonicToSeedSync } from '@scure/bip39';
import { Secp256k1Keypair } from '@mysten/sui/keypairs/secp256k1';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decode, fromWords } from 'bech32';

async function main() {
  const mnemonic = process.env.MNEMONIC;
  const suiprivkey = process.env.SUI_PRIVKEY;
  let keypair;

  try {
    if (mnemonic) {
      console.log('🔑 MNEMONIC에서 지갑 로드 중...');
      const seed = mnemonicToSeedSync(mnemonic, wordlist);
      const derived = seed.slice(0, 32); // Sui에서는 32바이트만 사용
      keypair = Secp256k1Keypair.fromSeed(derived);
    } else if (suiprivkey) {
      console.log('🔐 suiprivkey에서 지갑 로드 중...');
      const { prefix, words } = decode(suiprivkey);
      if (prefix !== 'suiprivkey') throw new Error('Invalid prefix');

      const fullBytes = Buffer.from(fromWords(words));
      if (fullBytes.length !== 33 || fullBytes[0] !== 0x00) {
        throw new Error('Invalid secret key format');
      }

      const secretKey = fullBytes.slice(1);
      keypair = Ed25519Keypair.fromSecretKey(secretKey);
    } else {
      throw new Error('❌ 환경변수 MNEMONIC 또는 SUI_PRIVKEY가 필요합니다.');
    }

    const address = keypair.getPublicKey().toSuiAddress();
    console.log(`✅ Sui 주소: ${address}`);
  } catch (err) {
    console.error('❌ 지갑 로딩 실패:', err);
  }
}

main();

