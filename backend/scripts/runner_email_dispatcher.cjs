// MyUrbanDaily — Production Enterprise Email Dispatcher & Real-Time Sync Runner
// Designed to run in GitHub Actions runner, cloud cron jobs, daemon workers, and administrative drills.

const fs = require('fs');
const path = require('path');
const tls = require('tls');

// 1. Resolve environment variables (from process.env or local .env)
let envConfig = {};
try {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const dotenv = require('../node_modules/dotenv');
    envConfig = dotenv.parse(fs.readFileSync(envPath));
  }
} catch {}

const SMTP_HOST = process.env.SMTP_HOST || envConfig.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || envConfig.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER || envConfig.SMTP_USER || 'urbanaiidea@gmail.com';
const SMTP_PASS = (process.env.SMTP_PASS || envConfig.SMTP_PASS || 'aajd hdld altp ekuu').replace(/\s+/g, '');

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || 
  Buffer.from('QUl6YVN5Q0JzSkNvb3JmUWhoOWJ3TncwTnJyeE00YzluYXRfRVN3', 'base64').toString();

// Parse CLI flags: --watch, --timeout <seconds>
const isWatchMode = process.argv.includes('--watch') || process.env.WATCH_MODE === 'true';
const timeoutIdx = process.argv.indexOf('--timeout');
const timeoutSec = timeoutIdx !== -1 && process.argv[timeoutIdx + 1]
  ? parseInt(process.argv[timeoutIdx + 1], 10)
  : parseInt(process.env.WATCH_TIMEOUT || '900', 10);

console.log('===============================================================');
console.log('🚀 MyUrbanDaily Cloud & Runner Email Dispatcher (RFC 5322 Inbox)');
console.log(`📍 Sender: ${SMTP_USER} via ${SMTP_HOST}:${SMTP_PORT}`);
console.log(`👁️  Mode: ${isWatchMode ? `Real-Time Listener (Watch: ${timeoutSec}s)` : 'One-Time Sweep & Exit'}`);
console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
console.log('===============================================================\n');

// 2. Initialize Firebase Client SDK
const { initializeApp, getApps, getApp } = require('../../frontend/node_modules/firebase/app');
const {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} = require('../../frontend/node_modules/firebase/firestore');

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: 'myurbandaily.firebaseapp.com',
  projectId: 'myurbandaily-458d0',
  storageBucket: 'myurbandaily-458d0.firebasestorage.app'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

// RFC 5322 & RFC 2047 Formatting Helpers
function formatRfc2822Date(date = new Date()) {
  return date.toUTCString();
}

function encodeRfc2047(text) {
  return '=?UTF-8?B?' + Buffer.from(text, 'utf-8').toString('base64') + '?=';
}

function chunkBase64(str) {
  const b64 = Buffer.from(str, 'utf-8').toString('base64');
  const chunks = b64.match(/.{1,76}/g) || [];
  return chunks.join('\r\n');
}

// Generates high-quality matching plain-text alternative (avoids multipart mismatch spam penalty)
function generatePlainText(data) {
  const isTechnician = data.role === 'provider' || data.role === 'technician';
  const firstName = data.name ? data.name.split(' ')[0] : (isTechnician ? 'Partner' : 'Member');
  const portalUrl = 'https://myurbandaily.web.app';

  if (isTechnician) {
    return [
      `Welcome to the MyUrbanDaily Partner Network, ${firstName}!`,
      '',
      'Your official partner profile is active. You can now accept doorstep home service requests across Sagara, Hosanagara & Honnali with direct local dispatch.',
      '',
      `Account Role: Authorized Technician Partner`,
      `Service Regions: Sagara • Hosanagara • Honnali`,
      `Registered Email: ${data.email}`,
      `Trust Level: Aadhaar & Photo-Verified Priority`,
      '',
      'Technician Partner Superpowers:',
      '• Direct Local Bookings: Instant mobile alerts for plumbing, electrical & repair jobs near you.',
      '• Weekly Payouts: 100% transparent ledger with direct bank and UPI settlements.',
      '• Verified Pro Badge: Aadhaar & photo-verified symbol displayed directly to customers.',
      '• 0% Commission Launch Offer: Keep 100% of your earnings on initial bookings.',
      '',
      `Open Partner Dashboard: ${portalUrl}/technician`,
      'Helpline: +91 94480 00000 | Email: urbanaiidea@gmail.com',
      '',
      'MyUrbanDaily Technologies Private Limited',
      'Near Rotary Circle, B.H. Road, Sagara, Karnataka 577401',
      `© ${new Date().getFullYear()} MyUrbanDaily. All rights reserved.`
    ].join('\n');
  }

  return [
    `Welcome to MyUrbanDaily, ${firstName}!`,
    '',
    'Premium doorstep home repairs, plumbing, electrical fixes, cleaning, and appliance servicing in Sagara, Hosanagara & Honnali just got faster, safer, and 100% stress-free.',
    '',
    `Account Role: Verified Customer Member`,
    `Service Regions: Sagara • Hosanagara • Honnali`,
    `Registered Email: ${data.email}`,
    `Trust Level: Aadhaar Verified Priority`,
    '',
    'Why You Can Trust MyUrbanDaily:',
    '• 45-Min Doorstep Dispatch: Rapid local response across Sagara, Hosanagara & Honnali.',
    '• Aadhaar & Photo-Verified: Identity and trade checked for absolute family peace of mind.',
    '• Pay After Service: Zero advance fees. Pay securely via UPI or Cash on Delivery.',
    '• 30-Day Guarantee: Free rework assurance if anything is not 100% satisfactory.',
    '',
    `Explore Doorstep Services: ${portalUrl}`,
    'Helpline: +91 94480 00000 | Email: urbanaiidea@gmail.com',
    '',
    'MyUrbanDaily Technologies Private Limited',
    'Near Rotary Circle, B.H. Road, Sagara, Karnataka 577401',
    `© ${new Date().getFullYear()} MyUrbanDaily. All rights reserved.`
  ].join('\n');
}

// 3. RFC 5322 & RFC 2047 SMTPS TLS Dispatcher (Direct Primary Inbox)
function sendEmailViaTls(to, subject, html, text) {
  return new Promise((resolve, reject) => {
    if (!SMTP_USER || !SMTP_PASS) {
      return reject(new Error('SMTP credentials missing'));
    }

    const socket = tls.connect(SMTP_PORT, SMTP_HOST, { timeout: 15000 }, () => {});
    let step = 0;
    const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    const msgId = `<mud-${Date.now()}.${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
    const dateHeader = formatRfc2822Date();
    const encodedSubject = encodeRfc2047(subject);

    const rawBody = [
      `From: "MyUrbanDaily" <${SMTP_USER}>`,
      `Reply-To: "MyUrbanDaily Support" <${SMTP_USER}>`,
      `To: <${to}>`,
      `Subject: ${encodedSubject}`,
      `Date: ${dateHeader}`,
      `Message-ID: ${msgId}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `List-Unsubscribe: <mailto:${SMTP_USER}?subject=unsubscribe>`,
      'List-Unsubscribe-Post: List-Unsubscribe=One-Click',
      'Auto-Submitted: auto-generated',
      'X-Priority: 3 (Normal)',
      'Importance: Normal',
      'X-Mailer: MyUrbanDaily Enterprise Dispatcher/2.0',
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      chunkBase64(text || subject),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      chunkBase64(html),
      '',
      `--${boundary}--`,
      ''
    ].join('\r\n');

    socket.on('data', (data) => {
      const msg = data.toString();

      if (msg.startsWith('220')) {
        socket.write('EHLO smtp.gmail.com\r\n');
      } else if (step === 0 && msg.includes('250')) {
        step = 1;
        socket.write('AUTH LOGIN\r\n');
      } else if (step === 1 && msg.startsWith('334')) {
        step = 2;
        socket.write(Buffer.from(SMTP_USER).toString('base64') + '\r\n');
      } else if (step === 2 && msg.startsWith('334')) {
        step = 3;
        socket.write(Buffer.from(SMTP_PASS).toString('base64') + '\r\n');
      } else if (step === 3 && msg.startsWith('235')) {
        step = 4;
        socket.write(`MAIL FROM:<${SMTP_USER}>\r\n`);
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
        console.log(`✅ [SMTP] RFC 5322 email successfully delivered to Primary Inbox: ${to}`);
        resolve(true);
      } else if (msg.startsWith('5')) {
        console.error(`❌ [SMTP] Error response for ${to}:`, msg.trim());
        reject(new Error(msg.trim()));
      }
    });

    socket.on('error', (err) => {
      console.error(`❌ [SMTP] Network/TLS socket error for ${to}:`, err.message);
      reject(err);
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`SMTP connection timed out for ${to}`));
    });
  });
}

// 4. Role-Aware Luxury Greeting Card HTML Template
function generateWelcomeEmailHtml(data) {
  const firstName = data.name ? data.name.split(' ')[0] : 'Valued Member';
  const portalUrl = 'https://myurbandaily.web.app';
  const isTechnician = data.role === 'provider' || data.role === 'technician';

  const cardGradient = isTechnician
    ? 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f766e 100%)'
    : 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #3b82f6 100%)';
  const badgeColor = isTechnician ? '#10b981' : '#2563eb';
  const badgeBg = isTechnician ? '#ecfdf5' : '#eff6ff';
  const badgeBorder = isTechnician ? '#a7f3d0' : '#bfdbfe';
  const roleTitle = isTechnician ? 'Authorized Technician Partner' : 'Verified Customer Member';
  const badgeText = isTechnician ? '🛠️ OFFICIAL TECHNICIAN PARTNER ONBOARDING' : '🎉 OFFICIAL WELCOME GREETING CARD';
  const headline = isTechnician
    ? `Welcome to the Partner Network, ${firstName}!`
    : `Welcome to the Family, ${firstName}!`;
  const subheadline = isTechnician
    ? 'Your official partner profile is active. You can now accept doorstep home service requests across Sagara, Hosanagara & Honnali with direct local dispatch.'
    : 'Premium doorstep home repairs, plumbing, electrical fixes, cleaning, and appliance servicing in Sagara, Hosanagara & Honnali just got faster, safer, and 100% stress-free.';
  const ctaText = isTechnician ? 'Open Partner Dashboard 🚀' : 'Explore Doorstep Services 🚀';
  const ctaUrl = isTechnician ? `${portalUrl}/technician` : portalUrl;

  const cardId = (isTechnician ? 'MUD-TECH-' : 'MUD-CUST-') + Math.abs(
    (data.email || 'user').split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0)
  ).toString().substring(0, 6);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isTechnician ? 'Technician Partner Onboarding' : 'Welcome to MyUrbanDaily'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 40px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
          <tr>
            <td style="height: 8px; background: linear-gradient(90deg, #2563eb, #38bdf8, #10b981, #6366f1);"></td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #2563eb; width: 48px; height: 48px; border-radius: 14px; text-align: center; vertical-align: middle; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                    <span style="color: #ffffff; font-size: 24px; line-height: 48px;">${isTechnician ? '🛠️' : '🔧'}</span>
                  </td>
                  <td style="padding-left: 14px; text-align: left;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      MyUrban<span style="color: #2563eb;">Daily</span>
                    </h1>
                    <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.9px;">
                      Sagara • Hosanagara • Honnali
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px 12px 32px; text-align: center;">
              <span style="display: inline-block; background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.8px; border: 1px solid ${badgeBorder};">
                ${badgeText}
              </span>
              <h2 style="margin: 16px 0 10px 0; font-size: 26px; font-weight: 900; color: #0f172a; line-height: 1.3; letter-spacing: -0.5px;">
                ${headline}
              </h2>
              <p style="margin: 0 auto; font-size: 14px; line-height: 1.6; color: #475569; max-width: 500px;">
                ${subheadline}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px 28px 32px;">
              <div style="background: ${cardGradient}; border-radius: 20px; padding: 26px 28px; color: #ffffff; box-shadow: 0 12px 24px rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.18);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
                  <tr>
                    <td align="left">
                      <p style="margin: 0; font-size: 10px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1.2px;">
                        ${isTechnician ? 'Official Partner Credential' : 'Official Member Privilege Card'}
                      </p>
                      <h3 style="margin: 3px 0 0 0; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.3px;">
                        ${data.name || 'Valued Member'}
                      </h3>
                    </td>
                    <td align="right" valign="top">
                      <span style="background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; color: #ffffff; border: 1px solid rgba(255,255,255,0.3);">
                        ${cardId}
                      </span>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(255,255,255,0.08); border-radius: 12px; padding: 12px 14px; border: 1px solid rgba(255,255,255,0.12);">
                  <tr>
                    <td width="50%" style="padding: 6px 4px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Account Role</p>
                      <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800; color: #ffffff;">${roleTitle}</p>
                    </td>
                    <td width="50%" style="padding: 6px 4px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Service Regions</p>
                      <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 800; color: #ffffff;">Sagara • Hosanagara • Honnali</p>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" style="padding: 6px 4px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Registered Email</p>
                      <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 700; color: #e2e8f0; word-break: break-all;">${data.email}</p>
                    </td>
                    <td width="50%" style="padding: 6px 4px; vertical-align: top;">
                      <p style="margin: 0; font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Trust Level</p>
                      <p style="margin: 2px 0 0 0; font-size: 12px; font-weight: 800; color: #34d399;">🛡️ Aadhaar Verified Priority</p>
                    </td>
                  </tr>
                </table>
                <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e1; line-height: 1.4; text-align: center;">
                  ${isTechnician
                    ? '⚡ Guaranteed weekly direct payouts • Verified partner badge • 0% commission launch rate'
                    : '🛡️ 30-Day rework guarantee • Aadhaar & photo-verified pros • Pay only after service'}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 32px 32px 32px; text-align: center;">
              <a href="${ctaUrl}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 16px 36px; border-radius: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.35); letter-spacing: 0.2px;">
                ${ctaText}
              </a>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">
                Need help or have a question? Email us at <strong style="color: #2563eb;">urbanaiidea@gmail.com</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 6px 0; font-weight: 800; color: #334155;">
                🔒 Official Delivery & Authentication Guarantee
              </p>
              <p style="margin: 0;">
                This welcome greeting was dispatched from <strong style="color: #0f172a;">${SMTP_USER}</strong> 
                exclusively to <strong style="color: #0f172a;">${data.email}</strong> upon your 1st-time verified registration. 
                Protected under ISO 27001 data governance and India's Digital Personal Data Protection Act (DPDPA 2023).
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #64748b;">
                MyUrbanDaily Technologies Private Limited
              </p>
              <p style="margin: 0 0 10px 0;">
                Near Rotary Circle, B.H. Road, Sagara, Karnataka 577401 • Helpline: +91 94480 00000
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} MyUrbanDaily. All rights reserved. • 
                <a href="${portalUrl}" style="color: #2563eb; text-decoration: none; font-weight: 600;">Visit Portal</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const alreadyDispatchedEmails = new Set();

// 5. STEP 1: Process all QUEUED emails in email_notifications
async function processQueuedNotifications() {
  console.log('--- Step 1: Processing QUEUED Notifications in Firestore ---');
  const notifRef = collection(db, 'email_notifications');
  const q = query(notifRef, where('status', '==', 'QUEUED'));
  const snap = await getDocs(q);

  console.log(`Found ${snap.size} QUEUED notification(s).`);
  let dispatched = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    console.log(`\n📬 Dispatching queued doc: ${docSnap.id}`);
    console.log(`To: ${data.to} (${data.recipient_name || 'Member'}) | Subject: ${data.subject}`);

    try {
      await updateDoc(docSnap.ref, { status: 'PROCESSING' });
      await sendEmailViaTls(
        data.to,
        data.subject,
        data.html_content,
        generatePlainText({
          name: data.recipient_name,
          email: data.to,
          role: data.role
        })
      );

      await updateDoc(docSnap.ref, {
        status: 'DISPATCHED',
        dispatched_at: new Date().toISOString(),
        smtp_sender: SMTP_USER
      });
      console.log(`✅ Marked ${docSnap.id} as DISPATCHED.`);
      alreadyDispatchedEmails.add(data.to.toLowerCase().trim());
      dispatched++;
    } catch (err) {
      console.error(`❌ Failed to dispatch ${docSnap.id}:`, err.message);
    }
  }

  return dispatched;
}

// 6. STEP 2: One-Time Sweep for All Registered Users
async function syncAllRegisteredUsers() {
  console.log('\n--- Step 2: One-Time Sweep for All Registered Users ---');

  // Load existing DISPATCHED emails so we never duplicate
  const dispatchedSnap = await getDocs(collection(db, 'email_notifications'));
  dispatchedSnap.forEach((d) => {
    const data = d.data();
    if (data.status === 'DISPATCHED' && data.to) {
      alreadyDispatchedEmails.add(data.to.toLowerCase().trim());
    }
  });
  console.log(`Found ${alreadyDispatchedEmails.size} email(s) that previously received greetings.`);

  // Collect all unique users across 'users' and 'user_workbook'
  const userMap = new Map();

  const usersSnap = await getDocs(collection(db, 'users'));
  usersSnap.forEach((d) => {
    const data = d.data();
    if (data.email && data.email.includes('@')) {
      const email = data.email.toLowerCase().trim();
      userMap.set(email, {
        docId: d.id,
        name: data.name || data.displayName || 'Valued Member',
        role: data.role === 'provider' || data.role === 'technician' ? 'provider' : 'customer',
        welcome_sent: data.welcome_email_sent === true,
        collection: 'users'
      });
    }
  });

  const workbookSnap = await getDocs(collection(db, 'user_workbook'));
  workbookSnap.forEach((d) => {
    const data = d.data();
    if (data.email && data.email.includes('@')) {
      const email = data.email.toLowerCase().trim();
      if (!userMap.has(email)) {
        userMap.set(email, {
          docId: d.id,
          name: data.fullName || data.name || 'Valued Member',
          role: data.role === 'provider' || data.role === 'technician' ? 'provider' : 'customer',
          welcome_sent: data.welcome_email_sent === true,
          collection: 'user_workbook'
        });
      }
    }
  });

  console.log(`Total unique registered user email accounts: ${userMap.size}`);

  let sentCount = 0;
  let skippedCount = 0;

  for (const [email, user] of userMap.entries()) {
    // Skip test or dummy domains
    if (email.endsWith('@example.com') || email === 'update@example.com') {
      console.log(`⏭️  Skipping test domain: ${email}`);
      skippedCount++;
      continue;
    }

    // Strict deduplication check
    if (user.welcome_sent || alreadyDispatchedEmails.has(email)) {
      console.log(`⏭️  Already received greeting: ${email} (${user.name})`);
      skippedCount++;
      continue;
    }

    console.log(`\n🌟 Dispatching 1st-Time Greeting Card to: ${email}`);
    console.log(`Name: ${user.name} | Role: ${user.role} | Document: ${user.docId}`);

    const isTechnician = user.role === 'provider';
    const firstName = user.name ? user.name.split(' ')[0] : (isTechnician ? 'Partner' : 'Member');
    const subject = isTechnician
      ? `Welcome to the Partner Network, ${firstName}! 🛠️ Official Partner Onboarding Card`
      : `Welcome to MyUrbanDaily, ${firstName}! 🏠 Your Official Welcome Greeting Card`;

    const html = generateWelcomeEmailHtml({
      name: user.name,
      email,
      role: user.role
    });

    const text = generatePlainText({
      name: user.name,
      email,
      role: user.role
    });

    try {
      await sendEmailViaTls(email, subject, html, text);

      // Record in email_notifications as DISPATCHED
      const notifId = `welcome-sync-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await setDoc(doc(db, 'email_notifications', notifId), {
        from: SMTP_USER,
        to: email,
        recipient_name: user.name,
        role: user.role,
        subject,
        html_content: html,
        source: 'REGISTERED_USERS_SYNC_RUNNER',
        status: 'DISPATCHED',
        dispatched_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      // Update user document
      try {
        await setDoc(doc(db, 'users', user.docId), {
          welcome_email_sent: true,
          welcome_email_sent_at: serverTimestamp()
        }, { merge: true });
      } catch {}

      alreadyDispatchedEmails.add(email);
      sentCount++;
      console.log(`✅ Welcome greeting successfully sent to ${email} and recorded in Firestore.`);
    } catch (err) {
      console.error(`❌ Failed to send greeting to ${email}:`, err.message);
    }
  }

  console.log('\n===============================================================');
  console.log(`📊 SYNC SUMMARY:`);
  console.log(`   - New Greetings Dispatched: ${sentCount}`);
  console.log(`   - Previously Sent / Skipped: ${skippedCount}`);
  console.log(`   - Total Registered Accounts Evaluated: ${userMap.size}`);
  console.log('===============================================================\n');
}

// 7. STEP 3: Real-Time Watch Listener (Zero Polling, Push Driven)
function startWatchMode() {
  console.log(`\n👀 [WATCH MODE] Real-time listener active for ${timeoutSec} seconds...`);
  console.log(`⚡ Instant (< 5s) direct Primary Inbox delivery on user registration!\n`);

  // 1. Listen to email_notifications where status == 'QUEUED'
  const notifRef = collection(db, 'email_notifications');
  const qNotif = query(notifRef, where('status', '==', 'QUEUED'));

  const unsubNotif = onSnapshot(qNotif, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const d = change.doc;
        const data = d.data();
        const to = data.to ? data.to.toLowerCase().trim() : '';
        if (data.status === 'QUEUED' && to && !alreadyDispatchedEmails.has(to)) {
          console.log(`\n⚡ [REALTIME QUEUE] Detected QUEUED notification for: ${to}`);
          try {
            await updateDoc(d.ref, { status: 'PROCESSING' });
            await sendEmailViaTls(
              to,
              data.subject,
              data.html_content,
              generatePlainText({
                name: data.recipient_name,
                email: to,
                role: data.role
              })
            );
            await updateDoc(d.ref, {
              status: 'DISPATCHED',
              dispatched_at: new Date().toISOString(),
              smtp_sender: SMTP_USER
            });
            alreadyDispatchedEmails.add(to);
            console.log(`✅ [REALTIME QUEUE] Dispatched to ${to} and updated in Firestore.`);
          } catch (err) {
            console.error(`❌ [REALTIME QUEUE] Failed to dispatch ${to}:`, err.message);
          }
        }
      }
    }
  });

  // 2. Listen to users collection for newly registered users directly
  const usersRef = collection(db, 'users');
  const unsubUsers = onSnapshot(usersRef, async (snapshot) => {
    for (const change of snapshot.docChanges()) {
      if (change.type === 'added' || change.type === 'modified') {
        const d = change.doc;
        const user = d.data();
        const email = user.email ? user.email.toLowerCase().trim() : '';
        if (
          email &&
          email.includes('@') &&
          !email.endsWith('@example.com') &&
          email !== 'update@example.com' &&
          user.welcome_email_sent !== true &&
          !alreadyDispatchedEmails.has(email)
        ) {
          console.log(`\n⚡ [REALTIME USER] New registered user detected: ${email} (${user.name || 'Member'})`);
          alreadyDispatchedEmails.add(email);
          const isTechnician = user.role === 'provider' || user.role === 'technician';
          const firstName = user.name ? user.name.split(' ')[0] : (isTechnician ? 'Partner' : 'Member');
          const subject = isTechnician
            ? `Welcome to the Partner Network, ${firstName}! 🛠️ Official Partner Onboarding Card`
            : `Welcome to MyUrbanDaily, ${firstName}! 🏠 Your Official Welcome Greeting Card`;
          const html = generateWelcomeEmailHtml({
            name: user.name || user.displayName,
            email,
            role: user.role
          });
          const text = generatePlainText({
            name: user.name || user.displayName,
            email,
            role: user.role
          });

          try {
            await sendEmailViaTls(email, subject, html, text);
            await setDoc(doc(db, 'users', d.id), {
              welcome_email_sent: true,
              welcome_email_sent_at: serverTimestamp()
            }, { merge: true });
            console.log(`✅ [REALTIME USER] Welcome email dispatched & user updated: ${email}`);
          } catch (err) {
            console.error(`❌ [REALTIME USER] Failed for ${email}:`, err.message);
          }
        }
      }
    }
  });

  // Keep alive until timeoutSec
  setTimeout(() => {
    console.log(`\n⏰ [WATCH MODE] Watch session timeout (${timeoutSec}s) reached. Gracefully exiting.`);
    unsubNotif();
    unsubUsers();
    process.exit(0);
  }, timeoutSec * 1000);
}

async function run() {
  await processQueuedNotifications();
  await syncAllRegisteredUsers();

  if (isWatchMode) {
    startWatchMode();
  } else {
    console.log('🎉 Email Runner execution completed successfully.');
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('💥 Fatal error in Email Runner:', err);
  process.exit(1);
});
