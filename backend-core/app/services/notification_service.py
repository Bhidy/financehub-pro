"""
Notification Service - Email + Discord
Sends alerts for scheduled job success/failure.
"""

import smtplib
import httpx
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    def __init__(self):
        # Email config
        self.smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
        self.smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        self.smtp_user = os.environ.get("SMTP_USER")
        self.smtp_pass = os.environ.get("SMTP_PASS")
        self.to_email = os.environ.get("ALERT_EMAIL")
        self.email_enabled = bool(self.smtp_user and self.smtp_pass and self.to_email)
        
        # Discord config
        self.discord_webhook_url = os.environ.get("DISCORD_WEBHOOK_URL")
        self.discord_enabled = bool(self.discord_webhook_url)
        
        logger.info(f"Notifications: Email={'ON' if self.email_enabled else 'OFF'}, Discord={'ON' if self.discord_enabled else 'OFF'}")

    def send_email(self, subject: str, body: str, is_error: bool = False):
        """Send email notification."""
        if not self.email_enabled:
            logger.warning(f"Email disabled. Subject: {subject}")
            return

        try:
            msg = MIMEMultipart()
            msg['From'] = self.smtp_user
            msg['To'] = self.to_email
            msg['Subject'] = f"{'[FAILURE]' if is_error else '[SUCCESS]'} FinanceHub: {subject}"

            msg.attach(MIMEText(body, 'plain'))

            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)
            server.quit()
            logger.info(f"Email sent: {subject}")
        except Exception as e:
            logger.error(f"Email failed: {e}")

    def send_discord(self, message: str, is_error: bool = False):
        """Send Discord webhook notification."""
        if not self.discord_enabled:
            logger.warning(f"Discord disabled. Message: {message[:50]}...")
            return
        
        emoji = "🚨" if is_error else "✅"
        content = f"{emoji} **FinanceHub**: {message}"
        
        try:
            # Use sync httpx for compatibility with APScheduler
            with httpx.Client() as client:
                response = client.post(
                    self.discord_webhook_url,
                    json={"content": content},
                    timeout=10
                )
                if response.status_code == 204:
                    logger.info(f"Discord sent: {message[:50]}...")
                else:
                    logger.warning(f"Discord response: {response.status_code}")
        except Exception as e:
            logger.error(f"Discord failed: {e}")
    
    def send_all(self, subject: str, body: str, is_error: bool = False):
        """Send both email and Discord notifications."""
        self.send_email(subject, body, is_error)
        self.send_discord(f"{subject}: {body[:200]}", is_error)


notification_service = NotificationService()
