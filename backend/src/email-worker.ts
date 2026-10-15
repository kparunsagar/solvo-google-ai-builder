// MyUrbanDaily — Real-time Firestore Email Queue Worker
// Listens in real-time for QUEUED email notifications in Firestore and dispatches via Gmail SMTP

import { sendSmtpMail } from './mailer.js';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  updateDoc,
  doc,
  Unsubscribe
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5Q0JzSkNvb3JmUWhoOWJ3TncwTnJyeE00YzluYXRfRVN3', 'base64').toString(),
  authDomain: 'myurbandaily.firebaseapp.com',
  projectId: 'myurbandaily-458d0',
  storageBucket: 'myurbandaily-458d0.firebasestorage.app',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export class EmailQueueWorker {
  private isProcessing = false;
  private unsubscribe: Unsubscribe | null = null;
  private fallbackInterval: NodeJS.Timeout | null = null;

  async processQueuedDoc(docSnap: any): Promise<boolean> {
    const data = docSnap.data();
    const to = data.to;
    const subject = data.subject;
    const html = data.html_content;
    const recipientName = data.recipient_name;
    const role = data.role || 'customer';

    if (!to || !to.includes('@')) {
      console.warn(`[EmailWorker] Invalid email recipient in doc ${docSnap.id}: ${to}`);
      return false;
    }

    console.log(`[EmailWorker] 📬 Processing QUEUED email for ${to} (${recipientName || 'Member'}) [Role: ${role}]`);

    try {
      const isTech = role === 'provider' || role === 'technician';
      const fallbackText = isTech
        ? `Welcome to the MyUrbanDaily Partner Network, ${recipientName || 'Partner'}! Your partner credential is active in Sagara, Hosanagara & Honnali. Accept bookings online at https://myurbandaily.web.app/technician`
        : `Welcome to MyUrbanDaily, ${recipientName || 'Member'}! Your verified membership is active in Sagara, Hosanagara & Honnali. Book trusted doorstep services at https://myurbandaily.web.app`;

      const sent = await sendSmtpMail({
        to,
        subject: subject || 'Welcome to MyUrbanDaily!',
        html: html || '<p>Welcome to MyUrbanDaily!</p>',
        text: data.text || fallbackText
      });

      if (sent) {
        await updateDoc(docSnap.ref, {
          status: 'DISPATCHED',
          dispatched_at: new Date().toISOString(),
          smtp_dispatched: true,
          smtp_from: process.env.SMTP_USER || 'urbanaiidea@gmail.com'
        });
        console.log(`[EmailWorker] ✅ Successfully dispatched email to ${to} (Doc: ${docSnap.id})`);
        return true;
      } else {
        console.warn(`[EmailWorker] ⚠️ SMTP dispatch failed for ${to}, leaving in QUEUED state for retry.`);
        return false;
      }
    } catch (err: any) {
      console.error(`[EmailWorker] ❌ Error processing doc ${docSnap.id}:`, err.message);
      return false;
    }
  }

  async processQueueOnce(): Promise<number> {
    if (this.isProcessing) return 0;
    this.isProcessing = true;
    let count = 0;

    try {
      const notifRef = collection(db, 'email_notifications');
      const q = query(notifRef, where('status', '==', 'QUEUED'));
      const snap = await getDocs(q);

      for (const docSnap of snap.docs) {
        const success = await this.processQueuedDoc(docSnap);
        if (success) count++;
      }
    } catch (err: any) {
      console.warn('[EmailWorker] Firestore queue query warning:', err.message);
    } finally {
      this.isProcessing = false;
    }

    return count;
  }

  start(): void {
    if (this.unsubscribe) return;
    console.log('[EmailWorker] 🚀 Real-time Firestore Email Queue Worker initialized.');

    // 1. One-time processing of any existing QUEUED items on startup
    this.processQueueOnce().catch(console.warn);

    // 2. Real-time onSnapshot listener (Zero-polling, push-driven from Firestore)
    try {
      const notifRef = collection(db, 'email_notifications');
      const q = query(notifRef, where('status', '==', 'QUEUED'));

      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
              const data = change.doc.data();
              if (data.status === 'QUEUED') {
                this.processQueuedDoc(change.doc).catch(console.warn);
              }
            }
          });
        },
        (error) => {
          console.warn('[EmailWorker] Real-time onSnapshot warning, falling back to periodic check:', error.message);
        }
      );
    } catch (e: any) {
      console.warn('[EmailWorker] Could not attach real-time listener:', e.message);
    }

    // 3. Fallback periodic check every 30 seconds (low-frequency safety net)
    if (!this.fallbackInterval) {
      this.fallbackInterval = setInterval(() => {
        this.processQueueOnce().catch(() => {});
      }, 30000);
    }
  }

  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    console.log('[EmailWorker] Service stopped');
  }
}

export const emailQueueWorker = new EmailQueueWorker();
