"""
One-time script to seed the first admin user.
Usage: python seed_admin.py
Set environment variables first (DATABASE_URL, JWT_SECRET, etc.).
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models.user import RolEnum, User
from auth_utils import hash_password

ADMIN_EMAIL = os.getenv("SEED_ADMIN_EMAIL", "admin@tradex.com")
ADMIN_PASSWORD = os.getenv("SEED_ADMIN_PASSWORD")
ADMIN_NOMBRE = os.getenv("SEED_ADMIN_NOMBRE", "Admin")

if not ADMIN_PASSWORD:
    print("ERROR: Set SEED_ADMIN_PASSWORD environment variable")
    sys.exit(1)

if len(ADMIN_PASSWORD) < 8:
    print("ERROR: SEED_ADMIN_PASSWORD must be at least 8 characters")
    sys.exit(1)

db = SessionLocal()
try:
    existing = db.query(User).filter(User.email == ADMIN_EMAIL).first()
    if existing:
        if existing.rol == RolEnum.admin:
            print(f"Admin already exists: {ADMIN_EMAIL}")
        else:
            existing.rol = RolEnum.admin
            db.commit()
            print(f"Promoted existing user to admin: {ADMIN_EMAIL}")
    else:
        admin = User(
            email=ADMIN_EMAIL,
            nombre=ADMIN_NOMBRE,
            hashed_password=hash_password(ADMIN_PASSWORD),
            rol=RolEnum.admin,
        )
        db.add(admin)
        db.commit()
        print(f"Admin created: {ADMIN_EMAIL}")
finally:
    db.close()
