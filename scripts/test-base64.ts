import { fromB64 } from '@mysten/bcs';

const key = 'AP3gXP6U4Yq+MpfomMM+caKhbUBDcpKZqsr2rmYEDfvf';

try {
  const decoded = fromB64(key);
  console.log('Decoded length:', decoded.length);
} catch (e) {
  console.error('Base64 decoding failed:', e);
}