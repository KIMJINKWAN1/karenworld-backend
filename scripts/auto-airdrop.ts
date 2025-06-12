import 'dotenv/config';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { fromB64 } from '@mysten/bcs';
import { admindb } from '../firebase/admin';

import {
  listUnclaimedRecipients,
  checkRecipientClaimStatus,
  markClaimed,
} from '../firebase/admin'; // ✅ 상대 경로로 수정

import { sendSlackNotification } from '../utils/slack'; // ✅ 상대 경로로 수정

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const AIRDROP_AMOUNT = BigInt(process.env.AIRDROP_AMOUNT || '2000');
const NETWORK = (process.env.SUI_NETWORK || "mainnet") as
  | "mainnet"
  | "testnet"
  | "devnet"
  | "localnet";

if (!PRIVATE_KEY) throw new Error('❌ .env에 PRIVATE_KEY 누락됨');


// ✅ keypair 초기화
const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));
const sender = keypair.getPublicKey().toSuiAddress();
console.log('🧾 Airdrop sender address:', sender);

// ✅ Sui 클라이언트
const client = new SuiClient({ url: getFullnodeUrl(NETWORK) });

// ✅ 가스 코인 조회
async function getGasCoin() {
  const owned = await client.getOwnedObjects({
    owner: sender,
    options: { showType: true, showContent: true },
  });

  const gas = owned.data.find(
    (o) => o.data?.type === '0x2::coin::Coin<0x2::sui::SUI>'
  );

  if (!gas || !gas.data) throw new Error('❌ 가스 코인 없음');
  return gas.data;
}

// ✅ 에어드랍 실행
async function runAirdrop() {
  console.log('🧾 Airdrop sender address:', sender);
  const unclaimed = await listUnclaimedRecipients();
  console.log(`🔍 Unclaimed recipients (${unclaimed.length}):`, unclaimed);

  if (unclaimed.length === 0) {
  console.log('⚠️ All addresses have already claimed the airdrop.');
  return;
}

  for (const recipient of unclaimed) {
    try {
      const already = await checkRecipientClaimStatus(recipient);
      if (already) {
      console.log(`⚠️ Duplicate address (already claimed): ${recipient}`);
      continue;
}

      const gasCoin = await getGasCoin();
      const tx = new TransactionBlock();

      // 💰 코인 분할 및 전송
      const [coinToSend] = tx.splitCoins(
        tx.object(COIN_OBJECT_ID),
        [tx.pure(Number(AIRDROP_AMOUNT), 'u64')]
      );
      tx.transferObjects([coinToSend], tx.pure(recipient));

      tx.setSender(sender);
      tx.setGasPayment([{
        objectId: gasCoin.objectId,
        version: gasCoin.version.toString(),
        digest: gasCoin.digest,
      }]);
      tx.setGasBudget(10_000_000);

      const result = await client.signAndExecuteTransactionBlock({
        transactionBlock: tx,
        signer: keypair,
        options: { showEffects: true },
      });

      const status = result.effects?.status?.status;
      if (status !== 'success') throw new Error('Transaction failed');

      await markClaimed(recipient, result.digest, Number(AIRDROP_AMOUNT));
      console.log(`✅ Claimed and logged: ${recipient}`);
      console.log(`✅ Success: ${recipient} (${result.digest})`);

      const claimsRef = admindb
      .collection('airdrop')
      .doc('prod')
      .collection('claims')
      .doc(recipient);

      await claimsRef.set({
      address: recipient, // ✅ 수정
      claimedAt: Date.now(),
      claimedAt_iso: new Date().toISOString(),
      amount: 2000,
      txDigest: result.digest, // ✅ 수정
      note: [
      '🚀 실제 전송 완료된 자동 에어드랍 기록입니다.',
      '🔐 지갑 주소는 Sui Mainnet 기준입니다.',
      '📦 프로젝트: KAREN_WORLD',
      ].join('\n'),
      });

      await sendSlackNotification([
        "🎉 *에어드랍 완료됨!*",
        `• 🧾 Wallet: \`${recipient}\``,
        `• 💸 수량: \`${AIRDROP_AMOUNT} $KAREN\``,
        `• 🔗 TxDigest: \`${result.digest}\``,
        `• 🕓 시간: \`${new Date().toISOString()}\``,
      ].join('\n'));
    } catch (err: any) {
      console.error(`❌ 에러 발생: ${recipient}`, err?.message);
      await sendSlackNotification([
        "❌ *에어드랍 실패!*",
        `• 🧾 Wallet: \`${recipient}\``,
        `• ❗ 오류: \`${err?.message}\``
      ].join('\n'));
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