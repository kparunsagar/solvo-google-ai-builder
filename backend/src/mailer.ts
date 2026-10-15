import tls from 'tls';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function formatRfc2822Date(date = new Date()): string {
  return date.toUTCString();
}

function encodeRfc2047(text: string): string {
  return '=?UTF-8?B?' + Buffer.from(text, 'utf-8').toString('base64') + '?=';
}

function chunkBase64(str: string): string {
  const b64 = Buffer.from(str, 'utf-8').toString('base64');
  const chunks = b64.match(/.{1,76}/g) || [];
  return chunks.join('\r\n');
}

export async function sendSmtpMail(options: MailOptions): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpUser = process.env.SMTP_USER || 'urbanaiidea@gmail.com';
  const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (!smtpUser || !smtpPass) {
    console.warn('[Mailer] SMTP credentials not set, skipping live email dispatch.');
    return false;
  }

  return new Promise((resolve) => {
    try {
      const socket = tls.connect(smtpPort, smtpHost, { timeout: 15000 }, () => {});
      let step = 0;

      const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).substring(2);
      const msgId = `<mud-${Date.now()}.${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
      const dateHeader = formatRfc2822Date();
      const encodedSubject = encodeRfc2047(options.subject);

      const rawBody = [
        `From: "MyUrbanDaily" <${smtpUser}>`,
        `Reply-To: "MyUrbanDaily Support" <${smtpUser}>`,
        `To: <${options.to}>`,
        `Subject: ${encodedSubject}`,
        `Date: ${dateHeader}`,
        `Message-ID: ${msgId}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        `List-Unsubscribe: <mailto:${smtpUser}?subject=unsubscribe>`,
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
        chunkBase64(options.text || options.subject),
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: base64',
        '',
        chunkBase64(options.html),
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
          socket.write(Buffer.from(smtpUser).toString('base64') + '\r\n');
        } else if (step === 2 && msg.startsWith('334')) {
          step = 3;
          socket.write(Buffer.from(smtpPass).toString('base64') + '\r\n');
        } else if (step === 3 && msg.startsWith('235')) {
          step = 4;
          socket.write(`MAIL FROM:<${smtpUser}>\r\n`);
        } else if (step === 4 && msg.startsWith('250')) {
          step = 5;
          socket.write(`RCPT TO:<${options.to}>\r\n`);
        } else if (step === 5 && msg.startsWith('250')) {
          step = 6;
          socket.write('DATA\r\n');
        } else if (step === 6 && msg.startsWith('354')) {
          step = 7;
          socket.write(rawBody + '\r\n.\r\n');
        } else if (step === 7 && msg.startsWith('250')) {
          step = 8;
          socket.write('QUIT\r\n');
          console.log(`[Mailer] Real email successfully delivered to ${options.to} via RFC 5322 TLS`);
          resolve(true);
        } else if (msg.startsWith('5')) {
          console.error(`[Mailer] SMTP rejection for ${options.to}:`, msg.trim());
          resolve(false);
        }
      });

      socket.on('error', (err) => {
        console.warn(`[Mailer] SMTP connection error for ${options.to}:`, err.message);
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
    } catch (e) {
      console.warn('[Mailer] Fatal SMTP error:', e);
      resolve(false);
    }
  });
}
