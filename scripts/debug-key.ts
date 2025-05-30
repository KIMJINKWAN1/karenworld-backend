import { fromB64 } from '@mysten/sui.js/utils';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs';
import dotenv from 'dotenv';
dotenv.config();

const raw = process.env.PRIVATE_KEY;

if (!raw || !raw.startsWith('suiprivkey1')) {
  console.error('❌ PRIVATE_KEY 형식 오류 (suiprivkey1...)');
  process.exit(1);
}

const base64 = raw.replace('suiprivkey1', '');
let decoded: Uint8Array;

try {
  decoded = fromB64(base64);
  console.log(`📦 decoded length: ${decoded.length}`);
  console.log('📦 raw bytes:', decoded.toString());
} catch (e) {
  console.error('❌ base64 decode 실패');
  console.error(e);
  process.exit(1);
}

if (decoded.length !== 33) {
  console.error(`❌ 길이 오류: ${decoded.length} (필요: 33 bytes, 0x00 + 32바이트 키)`);
  process.exit(1);
}

try {
  const keypair = Ed25519Keypair.fromSecretKey(decoded.slice(1));
  const address = keypair.getPublicKey().toSuiAddress();
  console.log('✅ 주소:', address);
} catch (e) {
  console.error('❌ Ed25519Keypair.fromSecretKey 실패');
  console.error(e);
}