import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/bcs';
import { Transaction } from '@mysten/sui/transactions';

import {
  checkRecipientClaimStatus,
  markClaimed,
  listUnclaimedRecipients,
} from '../firebase/admin.ts';
import { sendSlackNotification } from '../utils/slack.ts';

// ✅ 환경 변수
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const AIRDROP_AMOUNT = BigInt(process.env.AIRDROP_AMOUNT || '2000');
const NETWORK = process.env.SUI_NETWORK || 'testnet';

// ✅ 클라이언트 및 키쌍 생성
const sui = new SuiClient({ url: getFullnodeUrl(NETWORK) });
const fullSecret = fromB64(PRIVATE_KEY);
const secretKey = fullSecret.slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

// ✅ 가스 코인 조회
async function getGasCoin() {
  const owned = await sui.getOwnedObjects({
    owner: keypair.getPublicKey().toSuiAddress(),
    options: { showType: true, showContent: true },
  });

  const gas = owned.data.find((obj) =>
    obj.data?.type === '0x2::coin::Coin<0x2::sui::SUI>'
  );

  if (!gas || !gas.data) throw new Error('❌ No SUI gas coin found');

  return {
    objectId: gas.data.objectId,
    version: gas.data.version.toString(),
    digest: gas.data.digest,
  };
}

// ✅ 메인 함수
async function runAirdrop() {
  const unclaimed = await listUnclaimedRecipients();
  console.log(`📦 Total unclaimed recipients: ${unclaimed.length}`);

  for (const address of unclaimed) {
    try {
      const already = await checkRecipientClaimStatus(address);
      if (already) {
        console.log(`⚠️ Already claimed: ${address}`);
        continue;
      }

      const gasCoin = await getGasCoin();
      const tx = new Transaction();
      tx.setSender(keypair.getPublicKey().toSuiAddress());
      tx.setGasPayment([gasCoin]);
      tx.setGasBudget(10_000_000);

      const [coinToSend] = tx.splitCoins(
        tx.object(COIN_OBJECT_ID),
        [tx.pure(AIRDROP_AMOUNT)]
      );

      tx.transferObjects([coinToSend], address);

      const result = await sui.signAndExecuteTransaction({
        transaction: tx,
        signer: keypair,
        options: { showEffects: true },
      });

      const status = result.effects?.status?.status;
      if (status !== 'success') throw new Error('Transaction failed');

      await markClaimed(address, result.digest, Number(AIRDROP_AMOUNT));
      console.log(`✅ Success: ${address} (${result.digest})`);

      await sendSlackNotification(
        `🎯 *Airdrop Success*\n• 🧾 Wallet: \`${address}\`\n• 🔗 Tx: \`${result.digest}\`\n• 💰 Amount: ${AIRDROP_AMOUNT} KAREN`
      );
    } catch (err: any) {
      const message = err?.message || String(err);
      console.error(`❌ Failed for ${address}:`, message);
      await sendSlackNotification(
        `❌ *Airdrop Failed*\n• 🧾 Wallet: \`${address}\`\n• 💥 Error: \`${message}\``
      );
    }
  }
}

// ✅ 실행
runAirdrop()
  .then(() => {
    console.log('🏁 Airdrop completed.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('❌ Airdrop script failed:', e);
    process.exit(1);
  });

