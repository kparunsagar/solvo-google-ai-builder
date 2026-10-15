import sys
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import os

if len(sys.argv) < 3:
    print("Usage: smtp_mailer.py <recipient_email> <otp_code>")
    sys.exit(1)

recipient = sys.argv[1]
otp = sys.argv[2]

smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
smtp_port = int(os.environ.get("SMTP_PORT", "587"))
smtp_user = os.environ.get("SMTP_USER", os.environ.get("GMAIL_USER", "myurbandaily.services@gmail.com"))
smtp_pass = os.environ.get("SMTP_PASS", os.environ.get("GMAIL_APP_PASSWORD", ""))

msg = MIMEMultipart("alternative")
msg["Subject"] = f"[MyUrbanDaily] Your Legit Verification OTP: {otp}"
msg["From"] = f"MyUrbanDaily Security <{smtp_user}>"
msg["To"] = recipient

html_body = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; color: #0f172a;">
  <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; border: 1px solid #e2e8f0;">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #0f172a; margin: 0; font-size: 24px;">MyUrban<span style="color: #2563eb;">Daily</span></h1>
      <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Trusted Hyperlocal Home Services Platform</p>
    </div>
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
      <p style="margin: 0; font-size: 14px; color: #1e3a8a; font-weight: bold;">Legit Checker Email Verification</p>
      <p style="margin: 6px 0 0; font-size: 13px; color: #3b82f6;">Use the one-time code below to verify your Gmail address and complete registration.</p>
    </div>
    <div style="text-align: center; margin: 30px 0;">
      <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #2563eb; background: #f1f5f9; padding: 12px 24px; border-radius: 12px; display: inline-block;">{otp}</span>
    </div>
    <p style="font-size: 12px; color: #64748b; text-align: center;">This code is valid for 5 minutes. Never share your OTP with anyone.</p>
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">SOLVO • Hyperlocal Home Services Platform</p>
  </div>
</body>
</html>"""

msg.attach(MIMEText(f"Your MyUrbanDaily verification code is: {otp}. Valid for 5 minutes.", "plain"))
msg.attach(MIMEText(html_body, "html"))

if smtp_user and smtp_pass:
    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        print(f"SUCCESS: Real email sent to {recipient} via {smtp_host}")
    except Exception as e:
        print(f"SMTP ERROR: {e}")
        sys.exit(2)
else:
    print(f"NOTICE: Prepared real email for {recipient} with OTP {otp}. (Configure SMTP_USER & SMTP_PASS to transmit via Gmail server)")
