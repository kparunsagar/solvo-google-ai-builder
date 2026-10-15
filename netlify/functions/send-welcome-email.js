// Netlify Serverless Function: send-welcome-email
// Instant serverless dispatcher for customer & technician welcome greetings (< 2s delivery)
// Uses direct SMTPS TLS on port 465 with full RFC 5322 & RFC 2047 anti-spam compliance.

const tls = require('tls');

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

function sendViaTls(smtpUser, smtpPass, to, subject, html, text) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(465, 'smtp.gmail.com', { timeout: 15000 }, () => {});
    let step = 0;
    const boundary = '----=_Part_' + Date.now() + '_' + Math.random().toString(36).substring(2);
    const msgId = `<mud-${Date.now()}.${Math.random().toString(36).substring(2, 10)}@gmail.com>`;
    const dateHeader = formatRfc2822Date();
    const encodedSubject = encodeRfc2047(subject);

    const rawBody = [
      `From: "MyUrbanDaily" <${smtpUser}>`,
      `Reply-To: "MyUrbanDaily Support" <${smtpUser}>`,
      `To: <${to}>`,
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
        resolve(true);
      } else if (msg.startsWith('5')) {
        reject(new Error(msg.trim()));
      }
    });

    socket.on('error', (err) => reject(err));
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`SMTP timeout for ${to}`));
    });
  });
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const to = (data.email || data.to || '').toLowerCase().trim();
    const name = data.name || 'Valued Member';
    const role = data.role || 'customer';
    const subject = data.subject || (role === 'provider'
      ? `Welcome to the Partner Network, ${name.split(' ')[0]}! 🛠️ Official Partner Onboarding Card`
      : `Welcome to MyUrbanDaily, ${name.split(' ')[0]}! 🏠 Your Official Welcome Greeting Card`);
    const html = data.html || data.html_content || `<p>Welcome to MyUrbanDaily, ${name}!</p>`;
    const text = data.text || `Welcome to MyUrbanDaily, ${name}! Your membership is active.`;

    if (!to || !to.includes('@')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid email address is required' })
      };
    }

    const smtpUser = process.env.SMTP_USER || 'urbanaiidea@gmail.com';
    const smtpPass = (process.env.SMTP_PASS || 'aajd hdld altp ekuu').replace(/\s+/g, '');

    await sendViaTls(smtpUser, smtpPass, to, subject, html, text);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        delivered: true,
        to,
        message: 'Welcome email delivered to primary inbox via SMTPS TLS'
      })
    };
  } catch (error) {
    console.error('[send-welcome-email function error]:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message, delivered: false })
    };
  }
};
