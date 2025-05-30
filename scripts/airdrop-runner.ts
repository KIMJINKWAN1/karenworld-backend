import { addRecipient, checkRecipientClaimStatus, markClaimed, listUnclaimedRecipients } from './admin';

async function main() {
  // 1) 대상자 일괄 등록 예시
  const recipients = [
    { address: '0xabc123...', amount: 2000 },
    { address: '0xdef456...', amount: 2000 },
    { address: '0xghi789...', amount: 2000 },
  ];

  console.log('=== Adding recipients ===');
  for (const r of recipients) {
    await addRecipient(r.address, r.amount);
  }

  // 2) 개별 클레임 상태 확인
  console.log('=== Checking claim status ===');
  for (const r of recipients) {
    const claimed = await checkRecipientClaimStatus(r.address);
    console.log(`Address: ${r.address}, Claimed: ${claimed}`);
  }

  // 3) 미수령 대상자 목록 출력
  console.log('=== Listing unclaimed recipients ===');
  const unclaimed = await listUnclaimedRecipients();
  console.log(unclaimed);

  // 4) (예시) 토큰 전송 성공 후 수령 처리 마킹
  // 실제 토큰 전송 로직이 여기 있어야 하며, 성공 시 markClaimed 호출
  console.log('=== Marking claim for first unclaimed recipient ===');
  if (unclaimed.length > 0) {
    const firstUnclaimed = unclaimed[0];
    const mockTxHash = 'sample_tx_hash_1234567890';
    const amount = 2000;

    await markClaimed(firstUnclaimed, mockTxHash, amount);
    console.log(`Marked ${firstUnclaimed} as claimed with txHash ${mockTxHash}`);
  } else {
    console.log('No unclaimed recipients found.');
  }
}

main().catch(console.error);