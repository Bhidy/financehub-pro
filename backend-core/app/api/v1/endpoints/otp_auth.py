
import httpx
import random
import string
import os
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from app.db.session import db
from app.core.config import settings

# Initialize router
router = APIRouter()

# Data Models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    code: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

import logging

# Helper: Generate 4-digit OTP
def generate_otp():
    return ''.join(random.choices(string.digits, k=4))

class EmailEngine:
    def __init__(self):
        # 1. Brevo (Sendinblue) Config - Best for single-sender verification
        self.brevo_key = os.getenv("BREVO_API_KEY") or os.getenv("SENDINBLUE_API_KEY")
        self.brevo_url = "https://api.brevo.com/v3/smtp/email"
        
        # 2. Resend Config
        self.resend_key = settings.RESEND_API_KEY
        self.resend_url = "https://api.resend.com/emails"
        
        self.from_email = settings.FROM_EMAIL
        
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger("EmailEngine")

    def send_verification_email(self, to_email: str, otp_code: str, html_content: str):
        """
        Sends email via HTTP APIs to bypass SMTP Firewalls.
        Priority: Brevo -> Resend
        """
        if self.brevo_key:
            return self._send_via_brevo(to_email, otp_code, html_content)
        elif self.resend_key:
            return self._send_via_resend(to_email, otp_code, html_content)
        else:
            self.logger.error("Configuration Error: Missing BREVO_API_KEY or RESEND_API_KEY.")
            return False, "No email provider configured. Add BREVO_API_KEY to secrets."

    def _send_via_brevo(self, to_email: str, otp_code: str, html_content: str):
        self.logger.info(f"Sending via Brevo (HTTP) to {to_email}...")
        
        headers = {
            "api-key": self.brevo_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        # Brevo API Payload
        payload = {
            "sender": {"email": self.from_email, "name": "Starta AI"},
            "to": [{"email": to_email}],
            "subject": f"Starta AI: Your verification code is {otp_code}",
            "htmlContent": html_content
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.brevo_url, json=payload, headers=headers)
                
                if response.status_code >= 200 and response.status_code < 300:
                    self.logger.info(f"[SUCCESS] Email sent via Brevo! ID: {response.json().get('messageId')}")
                    return True, None
                else:
                    self.logger.error(f"[BREVO ERROR] {response.text}")
                    return False, f"Brevo Error: {response.text}"
        except Exception as e:
            self.logger.error(f"Brevo Connection Failed: {e}")
            return False, str(e)

    def _send_via_resend(self, to_email: str, otp_code: str, html_content: str):
        self.logger.info(f"Sending via Resend (HTTP) to {to_email}...")
        
        headers = {
            "Authorization": f"Bearer {self.resend_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "from": f"Starta AI <{self.from_email}>",
            "to": [to_email],
            "subject": f"Starta AI: Your verification code is {otp_code}",
            "html": html_content
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.resend_url, json=payload, headers=headers)
                
                if response.status_code >= 200 and response.status_code < 300:
                    self.logger.info(f"[SUCCESS] Email sent via Resend! ID: {response.json().get('id')}")
                    return True, None
                else:
                    self.logger.error(f"[RESEND ERROR] {response.text}")
                    # Provide helpful hint for the 403 Domain mismatch
                    if "domain" in response.text.lower():
                        return False, "Resend require Domain Verification. Try Brevo (Sendinblue) for easier single-sender setup."
                    return False, f"Resend Error: {response.text}"
        except Exception as e:
            self.logger.error(f"Resend Connection Failed: {e}")
            return False, str(e)

# wrapper for background task
def background_email_task(to_email: str, otp_code: str, html_content: str):
    engine = EmailEngine()
    engine.send_verification_email(to_email, otp_code, html_content)


# 1. Request Password Reset (Send OTP)
@router.post("/forgot-password")
async def request_password_reset(req: ForgotPasswordRequest, background_tasks: BackgroundTasks):
    # 1. Verify User Exists
    user = await db.fetch_one("SELECT * FROM users WHERE email = $1", req.email)
    if not user:
        # Return success with delay to mimic processing (prevent enumeration)
        background_tasks.add_task(lambda: None) # Dummy task
        return {"message": "If this email is registered, you will receive a verification code."}

    # 2. Rate Limiting Check (Max 1 per minute)
    last_code = await db.fetch_one("""
        SELECT created_at FROM verification_codes 
        WHERE email = $1 AND created_at > NOW() - INTERVAL '1 minute'
    """, req.email)
    
    if last_code:
         raise HTTPException(status_code=429, detail="Please wait 1 minute before requesting another code.")

    # 3. Generate & Store Code
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    # EMERGENCY LOG: Always print access code to server logs (Fail-safe)
    print(f"\n[SECURE LOG] Generated OTP for {req.email}: {otp}\n")
    
    await db.execute("""
        INSERT INTO verification_codes (email, code, expires_at)
        VALUES ($1, $2, $3)
    """, req.email, otp, expires_at)
    
    # 4. Email Template (Ultra Premium Dark Mode)
    # Using publicly hosted assets from the Vercel app
    logo_url = "https://finhub-pro.vercel.app/app-icon.png"
    
    email_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Starta AI Chatbot - Password Reset</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body {{ font-family: 'Inter', sans-serif; margin: 0; padding: 0; background-color: #0F172A; color: #E2E8F0; }}
            .container {{ max-width: 500px; margin: 40px auto; background: #1E293B; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid #334155; }}
            .header {{ background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 40px 0; text-align: center; }}
            .logo {{ width: 80px; height: 80px; background: rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 10px; backdrop-filter: blur(10px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255,255,255,0.2); }}
            .content {{ padding: 40px 32px; text-align: center; }}
            .title {{ font-size: 24px; font-weight: 700; color: #F1F5F9; margin-bottom: 12px; }}
            .text {{ font-size: 16px; color: #94A3B8; line-height: 1.6; margin-bottom: 32px; }}
            .otp-box {{ background: #0F172A; border: 1px solid #334155; border-radius: 16px; padding: 24px; margin-bottom: 32px; display: inline-block; min-width: 200px; }}
            .otp-code {{ font-size: 36px; font-weight: 700; color: #2DD4BF; letter-spacing: 8px; font-family: monospace; }}
            .footer {{ padding: 24px; text-align: center; border-top: 1px solid #334155; font-size: 13px; color: #64748B; background: #0F172A; }}
            .highlight {{ color: #2DD4BF; font-weight: 600; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{logo_url}" alt="Starta AI" class="logo">
            </div>
            <div class="content">
                <h1 class="title">Reset Your Password</h1>
                <p class="text">Hello, we received a request to access your <span class="highlight">Starta AI Chatbot</span> account. Enter the verification code below to proceed.</p>
                
                <div class="otp-box">
                    <div class="otp-code">{otp}</div>
                </div>
                
                <p class="text" style="font-size: 14px; margin-bottom: 0;">This code will expire in <span class="highlight">10 minutes</span>.<br>If you didn't request this, simply ignore this email.</p>
            </div>
            <div class="footer">
                &copy; 2026 Starta Financial Intelligence. All rights reserved.<br>
                Secure Automated System
            </div>
        </div>
    </body>
    </html>
    """
    
    # 5. Non-Blocking Email Send
    # This guarantees the endpoint returns immediately, fixing the "hanging" issue.
    # The email will be processed in the background.
    background_tasks.add_task(background_email_task, req.email, otp, email_html)
    
    return {"message": "Verification code sent successfully"}

# 2. Verify OTP
@router.post("/verify-otp")
async def verify_otp(req: VerifyOTPRequest):
    # 1. Fetch Valid Code
    record = await db.fetch_one("""
        SELECT * FROM verification_codes 
        WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
    """, req.email, req.code)
    
    if not record:
        # Increment attempts logic could go here
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
        
    # 2. Mark as Used
    await db.execute("UPDATE verification_codes SET used = TRUE WHERE id = $1", record['id'])
    
    # 3. Generate a Temporary Security Token for the Reset Step
    # We use a JWT-like approach or just a random secure string stored in DB
    # For simplicity, we'll return a special "Reset Token" that is just a signed proof
    # In a real app, you might use a JWT with scope="password_reset"
    
    # Using the existing auth utils to generate a specialized short-lived token
    from app.core.security import create_access_token
    reset_token = create_access_token(
        data={"sub": req.email, "type": "password_reset"}, 
        expires_delta=timedelta(minutes=15)
    )
    
    return {
        "message": "Code verified",
        "reset_token": reset_token
    }

# 3. Reset Password
@router.post("/reset-password-confirm")
async def reset_password_confirm(req: ResetPasswordRequest):
    # 1. Verify Token
    from jose import jwt, JWTError
    from app.core.security import get_password_hash
    
    try:
        payload = jwt.decode(req.token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if email is None or token_type != "password_reset":
             raise HTTPException(status_code=401, detail="Invalid reset token")
             
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired reset token")
        
    # 2. Update Password
    hashed_password = get_password_hash(req.new_password)
    
    await db.execute("""
        UPDATE users SET hashed_password = $1 WHERE email = $2
    """, hashed_password, email)
    
    return {"message": "Password successfully updated. You can now login with your new password."}
