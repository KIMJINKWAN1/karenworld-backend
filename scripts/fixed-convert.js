const { decode, fromWords } = require('bech32');
const { Buffer } = require('buffer');

const suiprivkey = 'suiprivkey1qr77qh87jnsc403jjl5f3se7wx32zm2qgdef9xd2etm2uesyphaa7qzlg0n';

try {
  const { prefix, words } = decode(suiprivkey);
  if (prefix !== 'suiprivkey') throw new Error('Invalid prefix');

  const data = Buffer.from(fromWords(words)); // [scheme(1) + secret(32)]
  const secretKey = data.slice(1); // skip scheme byte

  if (secretKey.length !== 32) throw new Error(`Invalid key length: ${secretKey.length}`);

  const base64 = secretKey.toString('base64');
  console.log('\n✅ 정확한 PRIVATE_KEY:\nPRIVATE_KEY=' + base64);
} catch (err) {
  console.error('❌ 변환 실패:', err);
}