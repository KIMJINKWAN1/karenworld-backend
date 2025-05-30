import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64 } from '@mysten/bcs';

// Base64 URL-safe → 표준 Base64 변환
function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64url.length + (4 - base64url.length % 4) % 4, '=');
}

// Private Key 처리
const rawKey = process.env.PRIVATE_KEY!;
const fixedKey = base64UrlToBase64(rawKey);
const fullSecret = fromB64(fixedKey);
const secretKey = fullSecret.slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const KAREN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const recipients: string[] = [
  // 여기에 에어드랍 받을 주소들 나열
  '0x1111...', '0x2222...', '0x3333...'
];

async function main() {
  const address = keypair.getPublicKey().toSuiAddress();

  const owned = await client.getOwnedObjects({ owner: address, options: { showType: true, showContent: true } });
  const gas = owned.data.find((o) => o.data?.type?.includes('0x2::coin::Coin<0x2::sui::SUI>'))?.data;

  if (!gas) throw new Error('❌ No gas object available');

  for (const recipient of recipients) {
    try {
      const tx = new Transaction();
      tx.setSender(address);
      tx.setGasPayment([
        {
          objectId: gas.objectId,
          version: gas.version.toString(),
          digest: gas.digest,
        },
      ]);
      tx.setGasBudget(10_000_000);

      const amount = 2000n;
      const [coinToSend] = tx.splitCoins(tx.object(KAREN_OBJECT_ID), [tx.pure('u64', amount)]);
      tx.transferObjects([coinToSend], recipient);

      const result = await client.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      console.log(`✅ Sent to ${recipient}:`, result.digest);
    } catch (e) {
      console.error(`❌ Failed for ${recipient}:`, e);
    }
  }
}

main().catch(console.error);
