import dotenv from 'dotenv';
import { Buffer } from 'buffer';

dotenv.config();

const key = process.env.PRIVATE_KEY;
if (!key) {
  console.error('PRIVATE_KEY is undefined');
  process.exit(1);
}

const buf = Buffer.from(key, 'base64');
console.log(`Decoded length: ${buf.length} bytes`);