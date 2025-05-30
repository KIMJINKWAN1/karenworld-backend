import dotenv from 'dotenv';
import { fromB64 } from '@mysten/sui.js/utils';

dotenv.config();

const key = process.env.PRIVATE_KEY!;
const b64 = key.replace('suiprivkey1', '');

try {
  const buf = fromB64(b64);
  console.log('🟢 base64 decode 성공. 길이:', buf.length);
  console.log('🔐 Hex:', buf.toString('hex'));
} catch (e) {
  console.error('❌ base64 decode 실패!');
  console.error(e);
}