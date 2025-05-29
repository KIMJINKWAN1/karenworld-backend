import 'dotenv/config';
import { db } from '../firebase/admin';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { fromB64 } from '@mysten/bcs';

const KAREN_COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const AMOUNT = 2000;
const DECIMALS = 9; // 1 Karen = 10^9

function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64url.length + (4 - base64url.length % 4) % 4, '=');
}

const rawKey = process.env.PRIVATE_KEY!;
const secret = fromB64(base64UrlToBase64(rawKey));
const keypair = Ed25519Keypair.fromSecretKey(secret.slice(1));

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

async function main() {
  const snapshot = await db.collection('airdrop').get();
  const unclaimed = snapshot.docs.filter(doc => doc.data().claimed !== true);

  for (const doc of unclaimed) {
    const address = doc.id;
    console.log(`🚀 Sending airdrop to ${address}`);

    const tx = new Transaction();
    tx.setSender(keypair.getPublicKey().toSuiAddress());

    const coins = await client.getOwnedObjects({ owner: tx.sender });
    const gas = coins.data.find(obj => obj.data?.type?.includes('sui::SUI'));

    if (!gas) throw new Error('No gas object found');

    tx.setGasPayment([{
      objectId: gas.data!.objectId,
      version: gas.data!.version.toString(),
      digest: gas.data!.digest,
    }]);

    tx.setGasBudget(10_000_000);

    const [splitCoin] = tx.splitCoins(KAREN_COIN_OBJECT_ID, [tx.pure.u64(AMOUNT * 10 ** DECIMALS)]);
    tx.transferObjects([splitCoin], tx.pure.address(address));

    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    const txHash = result.digest;
    console.log(`✅ Sent to ${address}, txHash: ${txHash}`);

    await db.collection('airdrop').doc(address).update({
      claimed: true,
      txHash,
      claimedAt: new Date().toISOString(),
    });
  }
}

main().catch(console.error);
