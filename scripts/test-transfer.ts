import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64 } from '@mysten/bcs';

// Base64 URL-safe → 표준 Base64 변환 함수
function base64UrlToBase64(base64url: string): string {
  base64url = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64url.length % 4) {
    base64url += '=';
  }
  return base64url;
}

// 환경변수 PRIVATE_KEY 읽기
const rawKey = process.env.PRIVATE_KEY;
if (!rawKey) throw new Error('PRIVATE_KEY is not defined in .env');

console.log('▶ PRIVATE_KEY env value:', rawKey);

const fixedKey = base64UrlToBase64(rawKey);
const fullSecret = fromB64(fixedKey);

if (fullSecret.length !== 33 || fullSecret[0] !== 0x00) {
  throw new Error('Invalid secret key format');
}

// Ed25519Keypair 생성 (첫 바이트 scheme 제외)
const secretKey = fullSecret.slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

async function main() {
  // 소유한 오브젝트 조회
  const ownedObjects = await client.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: {
      showType: true,
      showContent: true,
      showOwner: true,
      showPreviousTransaction: true,
      showDisplay: true,
    },
  });

  // 가스 코인 필터링 (SUI 코인)
  const gasObjects = ownedObjects.data.filter(
    (obj) => obj.data?.type === '0x2::coin::Coin<0x2::sui::SUI>'
  );

  if (gasObjects.length === 0) {
    throw new Error('No gas objects found for this address.');
  }

  const latestGas = gasObjects[0].data;

  console.log('Using gas object:', {
    objectId: latestGas.objectId,
    version: latestGas.version.toString(),
    digest: latestGas.digest,
  });

  // 에어드랍 토큰 및 받는 주소 설정
  const coinObjectId = '0xa405b26b23ae5aef6f879556fafe9adb0019dde66f44133a6082b61168b01745'; // KAREN 코인 오브젝트 ID
  const recipientAddress = '0x2111b2418003ca29db454c796e08e4078f9dbfb8af1489c11941134c21c7c7e1'; // 받는 사람 주소

  const tx = new Transaction();
  tx.setSender(keypair.getPublicKey().toSuiAddress());

  tx.setGasPayment([
    {
      objectId: latestGas.objectId,
      version: latestGas.version.toString(),
      digest: latestGas.digest,
    },
  ]);

  tx.setGasBudget(10_000_000);

  // 2000 KAREN만큼 분할하여 전송
  const amount = 2000n;
 const [coinToSend, _rest] = tx.splitCoins(tx.object(coinObjectId), [tx.pure("u64", amount)]);
 tx.transferObjects([coinToSend], recipientAddress); // recipientAddress는 그냥 문자열 변수

  const result = await client.signAndExecuteTransaction({
    signer: keypair,
    transaction: tx,
    options: {
      showEffects: true,
      showInput: true,
    },
  });

  console.log('Transaction result:', result);
}

main().catch(console.error);