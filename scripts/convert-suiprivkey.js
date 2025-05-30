const { decode, fromWords } = require('bech32');
const { Buffer } = require('buffer');

const suiprivkey = 'suiprivkey1qr77qh87jnsc403jjl5f3se7wx32zm2qgdef9xd2etm2uesyphaa7qzlg0n';

try {
  const { prefix, words } = decode(suiprivkey);
  if (prefix !== 'suiprivkey') {
    throw new Error('❌ Bech32 prefix가 suiprivkey가 아닙니다');
  }

  const fullBytes = Buffer.from(fromWords(words));
  const scheme = fullBytes[0];
  const secretKey = fullBytes.slice(1);

  if (secretKey.length !== 32) {
    throw new Error(`❌ secretKey 길이 오류: ${secretKey.length}바이트`);
  }

  const base64Key = secretKey.toString('base64');
  console.log('\n✅ 변환 성공! 아래 내용을 .env에 복사하세요:\n');
  console.log(`PRIVATE_KEY=${base64Key}\n`);
} catch (err) {
  console.error('❌ 변환 실패:', err);
}