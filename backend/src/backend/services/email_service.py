import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from ..config import settings

logger = logging.getLogger("screenalyze.mailer")

class EmailService:
    def __init__(self) -> None:
        pass

    def _is_smtp_configured(self) -> bool:
        return bool(settings.smtp_host and settings.smtp_host.strip())

    def _generate_html_template(self, code: str, expires_in_minutes: int = 10) -> str:
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Screenalyze Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #090D16; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F9FAFB;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #090D16; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 480px; background-color: #111827; border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);">
          <!-- Top Accent Glow -->
          <tr>
            <td style="background: linear-gradient(90deg, #6366F1, #06B6D4); height: 4px;"></td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <!-- Brand Island -->
              <div style="display: inline-block; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 30px; padding: 6px 14px; margin-bottom: 24px;">
                <span style="font-size: 13px; font-weight: 700; color: #A5B4FC; letter-spacing: 0.5px;">SCREENALYZE • PASSCODE</span>
              </div>

              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">Sign in to Screenalyze</h1>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 22px; color: #9CA3AF;">Use this 6-digit one-time verification code to complete your sign in. This code is confidential.</p>

              <!-- OTP Code Display Card -->
              <div style="background-color: #1F2937; border: 1px solid #374151; border-radius: 14px; padding: 20px 16px; margin-bottom: 28px; text-align: center;">
                <span style="font-family: 'SF Mono', Consolas, Menlo, Monaco, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818CF8; display: inline-block;">{code}</span>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; color: #9CA3AF;">
                ⏱️ Valid for <strong style="color: #F9FAFB;">{expires_in_minutes} minutes</strong>.
              </p>

              <hr style="border: 0; border-top: 1px solid #1F2937; margin: 24px 0;" />

              <p style="margin: 0; font-size: 11px; line-height: 18px; color: #6B7280;">
                If you did not request this email, you can safely ignore it. Someone may have typed your email by mistake. Never share this passcode with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0D131F; padding: 16px 32px; text-align: center; border-top: 1px solid #1F2937;">
              <p style="margin: 0; font-size: 11px; color: #4B5563;">Screenalyze AI • Next-Generation Screenshot Intelligence</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    def _generate_plain_text(self, code: str, expires_in_minutes: int = 10) -> str:
        return (
            f"Screenalyze One-Time Verification Code\n\n"
            f"Your 6-digit passcode is: {code}\n\n"
            f"This code will expire in {expires_in_minutes} minutes.\n"
            f"If you did not request this code, you can safely ignore this email.\n"
        )

    def _send_smtp_sync(self, to_email: str, subject: str, html_content: str, text_content: str) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
        msg["To"] = to_email

        part1 = MIMEText(text_content, "plain", "utf-8")
        part2 = MIMEText(html_content, "html", "utf-8")
        msg.attach(part1)
        msg.attach(part2)

        host = settings.smtp_host.strip()
        port = settings.smtp_port

        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(host, port, timeout=15) as server:
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user.strip(), settings.smtp_password.strip())
                server.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=15) as server:
                if settings.smtp_use_tls:
                    server.starttls()
                if settings.smtp_user and settings.smtp_password:
                    server.login(settings.smtp_user.strip(), settings.smtp_password.strip())
                server.send_message(msg)

    async def send_otp_email(self, to_email: str, code: str, expires_in_minutes: int = 10) -> bool:
        """
        Sends OTP email via configured SMTP server, or outputs to dev console logger
        when in local development or when SMTP is unconfigured.
        """
        subject = f"{code} is your Screenalyze verification code"
        html_body = self._generate_html_template(code, expires_in_minutes)
        text_body = self._generate_plain_text(code, expires_in_minutes)

        if not self._is_smtp_configured():
            # Dev Mode Console Transport (Nodemailer-style preview)
            box_width = 72
            logger.info("=" * box_width)
            logger.info("[DEV EMAIL TRANSPORT] Screenalyze Verification Code")
            logger.info("  To:        %s", to_email)
            logger.info("  Subject:   %s", subject)
            logger.info("  Code:      %s  (Expires in %d minutes)", code, expires_in_minutes)
            logger.info("  Note:      SMTP is unconfigured. Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env for live email delivery.")
            logger.info("=" * box_width)
            return True

        try:
            logger.info("Dispatching OTP email to %s via SMTP (%s:%d)", to_email, settings.smtp_host, settings.smtp_port)
            await asyncio.to_thread(self._send_smtp_sync, to_email, subject, html_body, text_body)
            logger.info("Successfully dispatched OTP email to %s", to_email)
            return True
        except Exception as e:
            logger.error("Failed to send OTP email via SMTP to %s: %s", to_email, e)
            # Log code to console as fallback so the user is never locked out
            logger.warning("[FALLBACK DEV CODE] Recipient: %s, Code: %s", to_email, code)
            return False

email_service = EmailService()
