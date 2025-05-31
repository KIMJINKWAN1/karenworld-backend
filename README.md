# 🪐 Karen World Backend

`Karen World` 프로젝트의 백엔드 API 서버입니다.  
에어드랍 자동화, Firestore 기반 기록 저장, Slack 알림 연동 등을 포함합니다.

---

## 🔗 배포 주소

- 프론트엔드: [https://karen-world.vercel.app](https://karen-world.vercel.app)
- 에어드랍 API: `POST https://karen-world.vercel.app/api/airdrop`
- 관리자 로그: [https://karen-world.vercel.app/admin/airdrop-log](https://karen-world.vercel.app/admin/airdrop-log)

---

## ⚙️ 주요 기능

| 기능 | 설명 |
|------|------|
| 🪂 자동 에어드랍 | 지갑 주소 제출 시 중복 확인 후 Sui 트랜잭션 실행 |
| 🔐 Firestore 기록 | 수령 주소 및 타임스탬프 저장 |
| 📣 Slack 알림 | 성공/실패 여부를 Slack으로 실시간 알림 |
| 📊 관리자 UI | 수령 내역을 실시간 확인 가능한 로그 페이지 제공 |

---

## 📁 디렉토리 구조

karenworld-backend/
├── pages/
│ ├── api/
│ │ ├── airdrop.ts
│ │ ├── check.ts
│ │ ├── index.ts
│ │ ├── status.ts
│ │ ├── submit.ts
│ └── admin/airdrop-log.tsx
│ └── admin/logs.ts
│ └── admin/retry.ts
├── firebase/admin.ts
├── utils/
│ ├── slack.ts
│ └── logger.ts
├── scripts/
│   └── auto-airdrop.ts        # 🤖 Firestore 큐 기반 자동 전송 스크립트
├── .env.local ← 실제 키 보관 (절대 커밋 금지)
├── .gitignore
└── README.md


---

## 🌐 환경 변수 (.env.local)

```env
# 🔑 Sui 서명용 키 (base64 형식)
PRIVATE_KEY=...

# 💰 전송할 코인 오브젝트 ID (ex. KAREN)
KAREN_COIN_OBJECT_ID=0x...

# 🔐 Slack Bot 연동
SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=CXXXXXXXXX

# 🔥 Firebase 인증 키 (firebase-key.json과 연동)
GOOGLE_APPLICATION_CREDENTIALS=firebase/firebase-key.json
