require('dotenv/config');

const {
  Ed25519Keypair,
  RawSigner,
  TransactionBlock,
  JsonRpcProvider,
  Connection,
} = require('@mysten/sui');

const keypair = Ed25519Keypair.generate();
const signer = new RawSigner(
  keypair,
  new JsonRpcProvider(new Connection({ fullnode: 'https://fullnode.testnet.sui.io' }))
);

async function main() {
  const address = await signer.getAddress();
  console.log('✅ 테스트넷 지갑 주소:', address);

  const tx = new TransactionBlock();
  // tx 안에 transfer 등의 로직 추가 가능
}

main().catch(console.error);