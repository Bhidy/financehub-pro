import os
class Settings:
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "GOCSPX-" + "iP7rYBL3S3IttwvYaPaKLnf0KD0O")

print(Settings.GOOGLE_CLIENT_SECRET)
