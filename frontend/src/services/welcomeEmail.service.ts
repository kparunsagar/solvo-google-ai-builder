// MyUrbanDaily Enterprise Welcome & Greeting Email Service
// Generates stunning HTML welcome emails for new users registering or signing in with Google

import { db, isFirebaseLive } from '../lib/firebase';
import { collection, doc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';

export interface WelcomeEmailData {
  name: string;
  email: string;
  role?: string;
  source?: 'GOOGLE_SSO' | 'EMAIL_OTP' | 'MANUAL_SIGNUP';
}

export function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const firstName = data.name ? data.name.split(' ')[0] : 'Valued Member';
  const portalUrl = 'https://solvo.web.app';
  const isTechnician = data.role === 'provider' || data.role === 'technician';

  // Role-specific theme colors and content
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
  <title>${isTechnician ? 'Technician Partner Onboarding' : 'Welcome to SOLVO'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 28px; overflow: hidden; box-shadow: 0 20px 40px rgba(15,23,42,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td style="height: 8px; background: linear-gradient(90deg, #2563eb, #38bdf8, #10b981, #6366f1);"></td>
          </tr>

          <!-- Header / Brand Logo -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <table role="presentation" align="center" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #2563eb; width: 48px; height: 48px; border-radius: 14px; text-align: center; vertical-align: middle; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
                    <span style="color: #ffffff; font-size: 24px; line-height: 48px;">${isTechnician ? '🛠️' : '🔧'}</span>
                  </td>
                  <td style="padding-left: 14px; text-align: left;">
                    <h1 style="margin: 0; font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
                      SOL<span style="color: #2563eb;">VO</span>
                    </h1>
                    <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: 800; color: #0284c7; text-transform: uppercase; letter-spacing: 0.9px;">
                      Sagara • Hosanagara • Honnali
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Banner Badge -->
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

          <!-- LUXURY GREETING CARD HERO MOCKUP -->
          <tr>
            <td style="padding: 16px 32px 28px 32px;">
              <div style="background: ${cardGradient}; border-radius: 20px; padding: 26px 28px; color: #ffffff; box-shadow: 0 12px 24px rgba(0,0,0,0.14); border: 1px solid rgba(255,255,255,0.18);">
                
                <!-- Card Header -->
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

                <!-- Card Details Grid -->
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

                <!-- Card Bottom Assurance -->
                <p style="margin: 16px 0 0 0; font-size: 11px; color: #cbd5e1; line-height: 1.4; text-align: center;">
                  ${isTechnician 
                    ? '⚡ Guaranteed weekly direct payouts • Verified partner badge • 0% commission launch rate' 
                    : '🛡️ 30-Day rework guarantee • Aadhaar & photo-verified pros • Pay only after service'}
                </p>

              </div>
            </td>
          </tr>

          <!-- 4 PILLARS OF TRUST / VALUE -->
          <tr>
            <td style="padding: 0 32px 24px 32px;">
              <h4 style="margin: 0 0 16px 0; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.8px; text-align: center;">
                ${isTechnician ? 'Your Technician Partner Superpowers' : 'Why You Can Trust SOLVO'}
              </h4>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                ${isTechnician ? `
                <tr>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">⚡</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Direct Local Bookings</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Instant mobile alerts for plumbing, electrical & repair jobs near you.</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">💸</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Weekly Payouts</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">100% transparent ledger with direct bank and UPI settlements.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">🛡️</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Verified Pro Badge</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Aadhaar & photo-verified symbol displayed directly to customers.</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">📈</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Zero Commission Offer</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Keep 100% of your earnings on initial bookings as a founding pro.</p>
                    </div>
                  </td>
                </tr>
                ` : `
                <tr>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">⚡</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">45-Min Doorstep Dispatch</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Rapid local response across Sagara, Hosanagara & Honnali.</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">🛡️</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Aadhaar & Photo-Verified</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Identity and trade checked for absolute family peace of mind.</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">💰</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">Pay After Service</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Zero advance fees. Pay securely via UPI or Cash on Delivery.</p>
                    </div>
                  </td>
                  <td width="50%" style="padding: 8px; vertical-align: top;">
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; height: 100%;">
                      <span style="font-size: 20px;">🔄</span>
                      <p style="margin: 6px 0 2px 0; font-size: 13px; font-weight: 800; color: #0f172a;">30-Day Guarantee</p>
                      <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">Free rework assurance if anything isn't 100% satisfactory.</p>
                    </div>
                  </td>
                </tr>
                `}
              </table>
            </td>
          </tr>

          <!-- PRIMARY ACTION BUTTON -->
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

          <!-- SENDER & SECURITY ASSURANCE -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; line-height: 1.6; text-align: center;">
              <p style="margin: 0 0 6px 0; font-weight: 800; color: #334155;">
                🔒 Official Delivery & Authentication Guarantee
              </p>
              <p style="margin: 0;">
                This welcome greeting was dispatched from <strong style="color: #0f172a;">urbanaiidea@gmail.com</strong> 
                exclusively to <strong style="color: #0f172a;">${data.email}</strong> upon your 1st-time verified login. 
                Dispatched securely from the official SOLVO platform.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              <p style="margin: 0 0 4px 0; font-weight: 700; color: #64748b;">
                SOLVO
              </p>
              <p style="margin: 0 0 10px 0;">
                Near Rotary Circle, B.H. Road, Sagara, Karnataka 577401 • Helpline: +91 94480 00000
              </p>
              <p style="margin: 0;">
                © ${new Date().getFullYear()} SOLVO. All rights reserved. • 
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

export const welcomeEmailService = {
  /**
   * Dispatches a branded Welcome Email to the user's Gmail address upon first-time registration or Google SSO
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    if (!data.email || !data.email.includes('@')) return false;

    const emailKey = `mud_welcome_sent_${data.email.trim().toLowerCase()}`;
    // Deduplicate: send welcome greeting only once per email address
    if (typeof localStorage !== 'undefined' && localStorage.getItem(emailKey) === 'true') {
      console.log(`[WelcomeEmail] Greeting already dispatched to ${data.email}, skipping duplicate.`);
      return true;
    }

    const isTechnician = data.role === 'provider' || data.role === 'technician';
    const firstName = data.name ? data.name.split(' ')[0] : (isTechnician ? 'Partner' : 'Friend');
    const html = generateWelcomeEmailHtml(data);
    const subject = isTechnician
      ? `Welcome to the Partner Network, ${firstName}! 🛠️ Official Partner Onboarding Card`
      : `Welcome to SOLVO, ${firstName}! 🏠 Your Official Welcome Greeting Card`;

    // 1. Queue to Cloud Firestore 'email_notifications' collection for automatic dispatcher
    let firestoreQueued = false;
    try {
      if (isFirebaseLive()) {
        const notifId = `welcome-${Date.now()}`;
        await setDoc(doc(db, 'email_notifications', notifId), {
          from: 'urbanaiidea@gmail.com',
          to: data.email.trim().toLowerCase(),
          recipient_name: data.name,
          role: data.role || 'customer',
          subject,
          html_content: html,
          source: data.source || 'GOOGLE_SSO',
          status: 'QUEUED',
          created_at: new Date().toISOString(),
          timestamp: serverTimestamp()
        });
        firestoreQueued = true;
      }
    } catch (e) {
      console.warn('[WelcomeEmail] Firestore email_notifications queue note:', e);
    }

    // 2. Also write to 'mail' collection if Firebase Trigger Email extension is configured
    try {
      if (isFirebaseLive()) {
        await addDoc(collection(db, 'mail'), {
          to: [data.email.trim().toLowerCase()],
          message: {
            from: 'SOLVO <urbanaiidea@gmail.com>',
            replyTo: 'urbanaiidea@gmail.com',
            subject,
            html,
            text: isTechnician
              ? `Welcome to the SOLVO Partner Network, ${data.name}! You are now authorized to accept doorstep jobs in Sagara, Hosanagara & Honnali.`
              : `Welcome to SOLVO, ${data.name}! Your trusted doorstep home services platform across Sagara, Hosanagara & Honnali.`
          }
        });
      }
    } catch {}

    // 3. Dispatch directly via API endpoints (instant serverless function, local backend, or proxy)
    const endpoints = [
      '/.netlify/functions/send-welcome-email',
      'http://localhost:5000/api/auth/send-welcome-email',
      '/api/auth/send-welcome-email'
    ];

    const customWebhook = (import.meta as any).env?.VITE_EMAIL_WEBHOOK_URL;
    if (customWebhook) {
      endpoints.unshift(customWebhook);
    }

    let directDispatched = false;
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'urbanaiidea@gmail.com',
            email: data.email.trim().toLowerCase(),
            name: data.name,
            role: data.role || 'customer',
            subject,
            html
          })
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          if (json.delivered || json.success) {
            directDispatched = true;
            console.log(`[WelcomeEmail] Direct delivery successful via ${ep}`);
            break;
          }
        }
      } catch {}
    }

    // Mark as dispatched locally
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(emailKey, 'true');
    }
    console.log(`[WelcomeEmail] Welcome email handled (Direct: ${directDispatched}, FirestoreQueued: ${firestoreQueued}) for ${data.email}`);
    return true;
  }
};
