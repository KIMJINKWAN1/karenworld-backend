import { fromB64 } from '@mysten/bcs';

function base64UrlToBase64(base64url: string): string {
  base64url = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64url.length % 4) {
    base64url += '=';
  }
  return base64url;
}

const key = 'AP3gXP6U4Yq+MpfomMM+caKhbUBDcpKZqsr2rmYEDfvf'; // .env 값 복붙

const fixedKey = base64UrlToBase64(key);

try {
  const decoded = fromB64(fixedKey);
  console.log('Decoded length:', decoded.length);
} catch (e) {
  console.error('Base64 decoding failed:', e);
}