// scripts/extract-base64-key.ts
import { decode, fromWords } from 'bech32';
import { toB64 } from '@mysten/bcs';
import * as dotenv from 'dotenv';

dotenv.config();

const suiprivkey = process.env.SUI_PRIVKEY!;
if (!suiprivkey) {
  throw new Error('❌ .env에 SUI_PRIVKEY가 없습니다.');
}

console.log('🔐 suiprivkey에서 지갑 로드 중...');

const { prefix, words } = decode(suiprivkey);
if (prefix !== 'suiprivkey') {
  throw new Error('❌ prefix가 suiprivkey가 아닙니다.');
}

const fullBytes = Buffer.from(fromWords(words));
if (fullBytes.length !== 33 || fullBytes[0] !== 0x00) {
  throw new Error(`❌ 포맷 오류. 길이: ${fullBytes.length} bytes`);
}

const secretKey = fullBytes.slice(1); // ✅ 32바이트
const base64Key = toB64(secretKey);

console.log('\n✅ 아래 값을 .env에 추가하세요:\n');
console.log(`PRIVATE_KEY_BASE64=${base64Key}`);
