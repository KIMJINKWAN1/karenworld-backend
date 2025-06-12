import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const snapshot = await db.collection('airdrop').doc('claims').collection('claims').get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        wallet: data.wallet,
        status: 'success',
        digest: data.txDigest || '',
        timestamp: data.claimedAt || 0,
        claimedAt_iso: data.claimedAt_iso || '',
        amount: data.amount || 0,
        note: data.note || '',
        slackNotified: true,
      };
    });

    res.status(200).json({ logs });
  } catch (err: any) {
    console.error('Error loading Firestore logs:', err.message);
    res.status(500).json({ error: err.message });
  }
}
