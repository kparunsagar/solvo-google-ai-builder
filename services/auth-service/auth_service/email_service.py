"""
Email OTP delivery via Gmail SMTP (TLS).
Requires env vars: SMTP_USER, SMTP_PASS (Google App Password)
Falls back to console log if not configured.
"""
import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
FROM_NAME = "MyUrbanDaily"

logger = logging.getLogger(__name__)


def _build_otp_email(to_email: str, otp: str, name: str = "") -> MIMEMultipart:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{otp} is your MyUrbanDaily verification code"
    msg["From"] = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"] = to_email

    greeting = f"Hi {name}," if name else "Hello,"
    html = f"""
    <html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f8fafc; margin:0; padding:20px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06);">
        <div style="background:linear-gradient(135deg,#2563eb,#4f46e5); padding:24px 32px;">
          <h1 style="color:white; margin:0; font-size:22px; font-weight:800;">MyUrban<span style="color:#bfdbfe;">Daily</span></h1>
          <p style="color:#bfdbfe; margin:4px 0 0; font-size:13px;">Trusted Home Services · Sagara, Karnataka</p>
        </div>
        <div style="padding:32px;">
          <p style="color:#334155; font-size:15px; margin:0 0 8px;">{greeting}</p>
          <p style="color:#64748b; font-size:14px; margin:0 0 24px;">Use this one-time password to verify your identity. Valid for 5 minutes.</p>
          <div style="background:#eff6ff; border:2px dashed #93c5fd; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px;">
            <p style="color:#1d4ed8; font-size:36px; font-weight:900; letter-spacing:8px; margin:0;">{otp}</p>
          </div>
          <p style="color:#94a3b8; font-size:12px; margin:0; line-height:1.6;">
            If you didn't request this, please ignore this email. 
            Never share this OTP with anyone — our team will never ask for it.
          </p>
        </div>
        <div style="background:#f8fafc; padding:16px 32px; border-top:1px solid #e2e8f0; text-align:center;">
          <p style="color:#94a3b8; font-size:11px; margin:0;">
            © 2026 SOLVO · Sagara, Shivamogga, Karnataka 577401
          </p>
        </div>
      </div>
    </body></html>
    """
    msg.attach(MIMEText(html, "html"))
    return msg


async def send_email_otp(to_email: str, otp: str, name: str = "") -> bool:
    """
    Send OTP email. Returns True on success, False on failure.
    Logs OTP to console when SMTP is not configured (dev mode).
    """
    if not SMTP_USER or not SMTP_PASS:
        logger.warning(
            f"[EMAIL OTP — DEV MODE] To: {to_email} | OTP: {otp} "
            f"| Set SMTP_USER and SMTP_PASS env vars for real delivery."
        )
        return True  # Return True so flow continues in dev mode

    try:
        msg = _build_otp_email(to_email, otp, name)
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        logger.info(f"[EMAIL OTP] Sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP Authentication failed. "
            "Make sure SMTP_PASS is a Google App Password (not your Gmail password). "
            "See: https://myaccount.google.com/apppasswords"
        )
        return False
    except Exception as e:
        logger.error(f"[EMAIL OTP] Failed to send to {to_email}: {e}")
        return False
