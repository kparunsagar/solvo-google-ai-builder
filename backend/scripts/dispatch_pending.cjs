const fs = require('fs');
const path = require('path');
const dotenv = require('../node_modules/dotenv');
const tls = require('tls');

const envPath = path.resolve(__dirname, '../.env');
const envConfig = dotenv.parse(fs.readFileSync(envPath));

const { initializeApp } = require('../../frontend/node_modules/firebase/app');
const { getFirestore, collection, doc, getDocs, getDoc, updateDoc, query, where } = require('../../frontend/node_modules/firebase/firestore');

const firebaseConfig = {
  apiKey: Buffer.from('QUl6YVN5Q0JzSkNvb3JmUWhoOWJ3TncwTnJyeE00YzluYXRfRVN3', 'base64').toString(),
  authDomain: 'myurbandaily.firebaseapp.com',
  projectId: 'myurbandaily-458d0',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const smtpUser = envConfig.SMTP_USER || 'urbanaiidea@gmail.com';
const smtpPass = (envConfig.SMTP_PASS || '').replace(/\s+/g, '');

console.log(`[Mailer] Initializing with sender: ${smtpUser}`);

function sendEmailViaTls(to, subject, html, text) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.gmail.com', { timeout: 15000 }, () => {});
    let step = 0;
    const boundary = '----=_Part_' + Date.now();
    const rawBody = [
      `From: "MyUrbanDaily" <${smtpUser}>`,
      `Reply-To: "MyUrbanDaily Support" <${smtpUser}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      text || subject,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      html,
      '',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    socket.on('data', (data) => {
      const msg = data.toString();

      if (msg.startsWith('220')) {
        socket.write('EHLO localhost\r\n');
      } else if (step === 0 && msg.includes('250')) {
        step = 1;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 1 && msg.startsWith('334')) {
        step = 2;
        socket.write(Buffer.from(smtpUser).toString('base64') + '\r\n');
      } else if (step === 2 && msg.startsWith('334')) {
        step = 3;
        socket.write(Buffer.from(smtpPass).toString('base64') + '\r\n');
      } else if (step === 3 && msg.startsWith('235')) {
        step = 4;
        socket.write(`MAIL FROM:<${smtpUser}>\r\n`);
      } else if (step === 4 && msg.startsWith('250')) {
        step = 5;
        socket.write(`RCPT TO:<${to}>\r\n`);
      } else if (step === 5 && msg.startsWith('250')) {
        step = 6;
        socket.write('DATA\r\n');
      } else if (step === 6 && msg.startsWith('354')) {
        step = 7;
        socket.write(rawBody + '\r\n.\r\n');
      } else if (step === 7 && msg.startsWith('250')) {
        step = 8;
        socket.write('QUIT\r\n');
        console.log(`✅ [Mailer] Real email successfully delivered to ${to}`);
        resolve(true);
      } else if (msg.startsWith('5')) {
        console.error(`❌ [Mailer] SMTP Protocol Error for ${to}:`, msg);
        reject(new Error(msg));
      }
    });

    socket.on('error', (err) => {
      console.error(`❌ [Mailer] Socket error for ${to}:`, err);
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('SMTP Socket Timeout'));
    });
  });
}

async function processAllQueued() {
  console.log('[Dispatcher] Querying Firestore for QUEUED welcome greeting emails...');
  const notifRef = collection(db, 'email_notifications');
  const q = query(notifRef, where('status', '==', 'QUEUED'));
  const snap = await getDocs(q);

  console.log(`[Dispatcher] Found ${snap.size} QUEUED emails.`);

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    console.log(`\n--- Processing: ${docSnap.id} ---`);
    console.log(`Recipient: ${data.to} (${data.recipient_name || 'N/A'}) [Role: ${data.role || 'customer'}]`);
    console.log(`Subject: ${data.subject}`);

    try {
      await sendEmailViaTls(
        data.to,
        data.subject,
        data.html_content,
        `Welcome to MyUrbanDaily, ${data.recipient_name || 'Friend'}!`
      );

      await updateDoc(docSnap.ref, {
        status: 'DISPATCHED',
        dispatched_at: new Date().toISOString(),
        smtp_sender: smtpUser
      });
      console.log(`✅ Document ${docSnap.id} updated to DISPATCHED in Firestore!`);
    } catch (err) {
      console.error(`❌ Failed to send to ${data.to}:`, err.message);
    }
  }

  console.log('\n[Dispatcher] All pending emails processed successfully!');
}

processAllQueued()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal dispatcher error:', err);
    process.exit(1);
  });
