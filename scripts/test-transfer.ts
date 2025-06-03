import 'dotenv/config';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { derivePath } = require('ed25519-hd-key');

import { mnemonicToSeedSync } from '@scure/bip39';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const MNEMONIC = process.env.MNEMONIC!;
const AIR_DROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS!;
const DERIVATION_PATH = "m/44'/784'/0'/0'/0'";

// 🔐 키 생성
const seed = mnemonicToSeedSync(MNEMONIC);
const { key } = derivePath(DERIVATION_PATH, seed);
const keypair = Ed25519Keypair.fromSecretKey(key);

// 🌐 Sui 클라이언트
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

async function main() {
  const address = keypair.getPublicKey().toSuiAddress();
  console.log('🔑 Loaded address:', address);

  // 🧾 소유한 객체 목록 조회
  const objects = await client.getOwnedObjects({
    owner: address,
    options: { showType: true, showContent: true },
  });

  // ⛽️ 가스 코인 선택
  const gasCoins = objects.data.filter(
    (o) => o.data?.type === '0x2::coin::Coin<0x2::sui::SUI>'
  );
  if (gasCoins.length === 0) throw new Error('No SUI gas coin found');

  const gasCoin = gasCoins[0].data!;

  // 🧾 전송 트랜잭션 생성
  const tx = new TransactionBlock();
  const amount = 2_000n;

  const [coinToSend] = tx.splitCoins(tx.object(AIR_DROP_COIN_ID), [
    tx.pure(amount),
  ]);
  tx.transferObjects([coinToSend], tx.pure(RECIPIENT_ADDRESS));

  // 🔐 서명 및 실행
  const result = await client.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: keypair,
    options: {
      showEffects: true,
      showEvents: true,
    },
  });

  console.log('✅ Transaction executed!');
  console.dir(result, { depth: null });
}

main().catch((err) => {
  console.error('❌ Error:', err.message || err);
});






