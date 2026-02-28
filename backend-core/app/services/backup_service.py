"""
Weekly Database Backup Service
==============================
Runs pg_dump against the Supabase PostgreSQL database, compresses the output
with gzip, and writes a single file to /app/backups/financehub_weekly.sql.gz.
Each run OVERWRITES the previous backup to save disk space.

Schedule: Every Thursday at 03:00 Cairo time (registered in scheduler.py).
"""

import asyncio
import logging
import os
import time
from datetime import datetime, timezone
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

BACKUP_DIR = "/app/backups"
BACKUP_FILENAME = "financehub_weekly.sql.gz"
BACKUP_PATH = os.path.join(BACKUP_DIR, BACKUP_FILENAME)


class BackupService:
    def __init__(self):
        self.last_backup_time: str | None = None
        self.last_backup_size_mb: float = 0.0
        self.last_backup_status: str = "never_run"
        self.last_backup_error: str | None = None
        self.is_running: bool = False

    def _parse_database_url(self) -> dict:
        """Parse DATABASE_URL into pg_dump-compatible components."""
        db_url = os.getenv("DATABASE_URL", "")
        if not db_url:
            raise ValueError("DATABASE_URL environment variable is not set")

        parsed = urlparse(db_url)
        return {
            "host": parsed.hostname or "localhost",
            "port": str(parsed.port or 5432),
            "user": parsed.username or "postgres",
            "password": parsed.password or "",
            "dbname": parsed.path.lstrip("/") or "postgres",
        }

    async def run_backup(self) -> dict:
        """
        Execute a full database backup using pg_dump.
        
        Returns a dict with status, file_size_mb, duration_seconds, and timestamp.
        """
        if self.is_running:
            return {"status": "skipped", "reason": "Backup already in progress"}

        self.is_running = True
        start_time = time.time()

        try:
            db = self._parse_database_url()

            # Ensure backup directory exists
            os.makedirs(BACKUP_DIR, exist_ok=True)

            # Delete old backup if it exists
            if os.path.exists(BACKUP_PATH):
                os.remove(BACKUP_PATH)
                logger.info("🗑️ Old backup deleted.")

            # Build pg_dump command piped through gzip
            # --clean: DROP objects before creating
            # --if-exists: Don't error on DROP if object doesn't exist
            # --no-owner: Skip ownership commands (portable across environments)
            # --no-acl: Skip privilege commands
            env = os.environ.copy()
            env["PGPASSWORD"] = db["password"]

            cmd = (
                f'pg_dump -h {db["host"]} -p {db["port"]} -U {db["user"]} '
                f'-d {db["dbname"]} '
                f'--clean --if-exists --no-owner --no-acl '
                f'--format=custom --compress=6 '
                f'-f {BACKUP_PATH}'
            )

            logger.info(f"🔄 Starting database backup to {BACKUP_PATH}...")

            proc = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )
            stdout, stderr = await proc.communicate()

            duration = round(time.time() - start_time, 1)

            if proc.returncode != 0:
                error_msg = (stderr or stdout or b"").decode(errors="ignore")[:500]
                self.last_backup_status = "failed"
                self.last_backup_error = error_msg
                self.last_backup_time = datetime.now(timezone.utc).isoformat()
                logger.error(f"❌ Backup FAILED ({duration}s): {error_msg}")

                # Discord notification
                self._notify(
                    f"❌ **Weekly Backup FAILED**\n"
                    f"Duration: {duration}s\n"
                    f"Error: ```{error_msg[:300]}```",
                    is_error=True,
                )
                return {
                    "status": "failed",
                    "error": error_msg,
                    "duration_seconds": duration,
                }

            # Success - get file size
            file_size_bytes = os.path.getsize(BACKUP_PATH) if os.path.exists(BACKUP_PATH) else 0
            file_size_mb = round(file_size_bytes / (1024 * 1024), 2)

            self.last_backup_time = datetime.now(timezone.utc).isoformat()
            self.last_backup_size_mb = file_size_mb
            self.last_backup_status = "success"
            self.last_backup_error = None

            logger.info(f"✅ Backup SUCCESS: {file_size_mb} MB in {duration}s")

            self._notify(
                f"✅ **Weekly Backup Success**\n"
                f"File: `{BACKUP_FILENAME}`\n"
                f"Size: **{file_size_mb} MB**\n"
                f"Duration: **{duration}s**\n"
                f"Time: {self.last_backup_time}",
                is_error=False,
            )

            return {
                "status": "success",
                "file": BACKUP_PATH,
                "file_size_mb": file_size_mb,
                "duration_seconds": duration,
                "timestamp": self.last_backup_time,
            }

        except Exception as e:
            duration = round(time.time() - start_time, 1)
            self.last_backup_status = "error"
            self.last_backup_error = str(e)
            self.last_backup_time = datetime.now(timezone.utc).isoformat()
            logger.exception(f"🔥 Backup exception: {e}")

            self._notify(
                f"🔥 **Weekly Backup EXCEPTION**\n"
                f"Error: ```{str(e)[:300]}```",
                is_error=True,
            )
            return {"status": "error", "error": str(e), "duration_seconds": duration}

        finally:
            self.is_running = False

    def get_status(self) -> dict:
        """Return the current backup status for the admin dashboard."""
        return {
            "last_backup_time": self.last_backup_time,
            "last_backup_size_mb": self.last_backup_size_mb,
            "last_backup_status": self.last_backup_status,
            "last_backup_error": self.last_backup_error,
            "is_running": self.is_running,
            "backup_path": BACKUP_PATH,
            "file_exists": os.path.exists(BACKUP_PATH),
            "schedule": "Every Thursday at 03:00 Cairo time",
        }

    def _notify(self, message: str, is_error: bool = False):
        """Send Discord notification (non-blocking, non-crashing)."""
        try:
            from app.services.notification_service import notification_service
            notification_service.send_discord(message, is_error=is_error)
        except Exception as e:
            logger.warning(f"Backup notification failed (non-critical): {e}")


backup_service = BackupService()
