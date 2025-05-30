const { decode, fromWords } = require('bech32');
const { Buffer } = require('buffer');

const suiprivkey = 'suiprivkey1qr77qh87jnsc403jjl5f3se7wx32zm2qgdef9xd2etm2uesyphaa7qzlg0n';

try {
  const { prefix, words } = decode(suiprivkey);
  if (prefix !== 'suiprivkey') throw new Error('Invalid prefix');

  const fullBytes = Buffer.from(fromWords(words)); // [scheme(1), secretKey(32)]
  if (fullBytes.length !== 33) throw new Error(`Expected 33 bytes, got ${fullBytes.length}`);

  // ⛳ 전체 33바이트 인코딩해야 함 (scheme + secretKey)
  const base64 = fullBytes.toString('base64');
  console.log('\n✅ 정확한 PRIVATE_KEY (33바이트):');
  console.log('PRIVATE_KEY=' + base64);
} catch (err) {
  console.error('❌ 변환 실패:', err);
}