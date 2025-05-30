import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
// @ts-ignore
import { TransactionBlock as transactions } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromB64 } from '@mysten/bcs';
import { adminDb } from '../firebase/admin';
import { sendSlackNotification } from '../utils/slack';
import fs from 'fs';

const COLLECTION_PATH = 'airdrop/claims/claims';
const LOG_COLLECTION = 'airdropLog';
const CLAIM_PER_USER = 2_000_000_000_000;
const DELAY_MS = 2000;

const sui = new SuiClient({ url: getFullnodeUrl('testnet') });
const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.PRIVATE_KEY!));
const SENDER_ADDRESS = keypair.getPublicKey().toSuiAddress();
const COIN_TYPE = process.env.COIN_TYPE || '0x2::sui::SUI';

const successes: string[] = [];
const failures: { address: string; error: string }[] = [];

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getKarenBalance(address: string): Promise<bigint> {
  const coins = await sui.getCoins({ owner: address, coinType: COIN_TYPE });
  return coins.data.reduce((sum: bigint, c: any) => sum + BigInt(c.balance), BigInt(0));
}

async function getInputCoin(): Promise<string> {
  const coins = await sui.getCoins({ owner: SENDER_ADDRESS, coinType: COIN_TYPE });
  if (!coins.data.length) throw new Error('🪙 사용 가능한 코인이 없습니다.');
  return coins.data[0].coinObjectId;
}

async function simulateAirdrop() {
  const snapshot = await adminDb.collection(COLLECTION_PATH).get();
  const addresses = snapshot.docs.map(doc => doc.id);

  console.log(`🚀 총 ${addresses.length}명에게 시뮬레이션을 시작합니다.`);

  for (const address of addresses) {
    const alreadyClaimed = await adminDb.collection(COLLECTION_PATH).doc(address).get();
    if (alreadyClaimed.exists) {
      console.log(`⛔ 이미 수령한 주소입니다: ${address}`);
      continue;
    }

    try {
      const balance = await getKarenBalance(SENDER_ADDRESS);
      if (balance < BigInt(CLAIM_PER_USER)) {
        console.warn(`⚠️ 잔액 부족: 남은 KAREN = ${balance}`);
        break;
      }

      const inputCoin = await getInputCoin();

      const tx = new transactions();
      tx.pay({
        inputCoins: [inputCoin],
        recipients: [address],
        amounts: [CLAIM_PER_USER],
      });

      const result = await sui.signAndExecuteTransaction({
        signer: keypair,
        transaction: tx,
        options: { showEffects: true },
      });

      if (!result.effects || result.effects.status.status !== 'success') {
        throw new Error(JSON.stringify(result.effects?.status));
      }

      await sendSlackNotification(`✅ 에어드롭 성공: ${address}`);
      console.log(`✅ ${address} 에어드롭 성공`);
      successes.push(address);

      await adminDb.collection(LOG_COLLECTION).add({
        address,
        claimedAt: Date.now(),
        digest: result.digest,
        success: true,
      });
    } catch (err: any) {
      const message = err?.message || 'Unknown error';
      console.error(`❌ ${address} 에러 발생:`, message);
      failures.push({ address, error: message });

      await adminDb.collection(LOG_COLLECTION).add({
        address,
        failedAt: Date.now(),
        error: message,
        success: false,
      });

      await sendSlackNotification(`❌ 에어드롭 실패: ${address}\n${message}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync('success.json', JSON.stringify(successes, null, 2));
  fs.writeFileSync('failures.json', JSON.stringify(failures, null, 2));

  console.log(`🎉 시뮬레이션 완료`);
  console.log(`✅ 성공: ${successes.length}명`);
  console.log(`❌ 실패: ${failures.length}명`);
}

simulateAirdrop().catch(console.error);