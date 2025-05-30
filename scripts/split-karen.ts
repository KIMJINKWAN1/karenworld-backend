import * as dotenv from 'dotenv';
dotenv.config();

import { fromB64 } from '@mysten/bcs';
import {
  Ed25519Keypair,
  JsonRpcProvider,
  RawSigner,
  TransactionBlock,
} from '@mysten/sui';

const provider = new JsonRpcProvider();
const secretKey = fromB64(process.env.PRIVATE_KEY!).slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const signer = new RawSigner(keypair, provider);

const splitKaren = async () => {
  const tx = new TransactionBlock();
  const coin = tx.object(process.env.AIR_DROP_COIN_ID!);
  const splitAmount = 1_000_000;
  const [newCoin] = tx.splitCoins(coin, [tx.pure(splitAmount)]);
  tx.transferObjects([newCoin], tx.pure(process.env.AIRDROP_WALLET_ADDRESS!));

  const result = await signer.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    options: { showEffects: true, showObjectChanges: true },
  });

  console.log('✅ Transaction Success!');
  console.log('📦 Digest:', result.digest);

  const created = result.objectChanges?.filter((c: any) => c.type === 'created');
  for (const obj of created) {
    console.log('🆕 Created Coin:', obj.objectId);
  }
};

splitKaren().catch((err) => {
  console.error('❌ Transaction failed!');
  console.dir(err, { depth: null });

  try {
    console.log('🧵 JSON.stringify:', JSON.stringify(err));
  } catch (e) {
    console.log('🧵 Cannot stringify error');
  }

  try {
    console.log('📣 Error.message:', err?.message);
    console.log('📣 Error.stack:', err?.stack);
  } catch (e) {
    console.log('📣 Cannot extract message or stack');
  }

  try {
    console.log('🧵 Raw keys:', Object.keys(err));
  } catch (e) {
    console.log('🧵 Cannot list error keys');
  }
});
