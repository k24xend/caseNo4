import uuid
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pwdlib import PasswordHash
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import get_db
from .models import RefreshSession, User

password_hash = PasswordHash.recommended()
bearer = HTTPBearer()


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return password_hash.verify(password, hashed)


def token(user_id: str, kind: str, minutes: int, token_id: str | None = None) -> str:
    now = datetime.now(UTC)
    return jwt.encode(
        {"sub": user_id, "type": kind, "jti": token_id, "iat": now, "exp": now + timedelta(minutes=minutes)},
        get_settings().jwt_secret,
        algorithm="HS256",
    )


async def tokens(user_id: str, db: AsyncSession) -> dict[str, str]:
    token_id = str(uuid.uuid4())
    db.add(RefreshSession(user_id=user_id, token_id=token_id, expires_at=datetime.now(UTC) + timedelta(days=30)))
    await db.commit()
    return {
        "access_token": token(user_id, "access", 30),
        "refresh_token": token(user_id, "refresh", 60 * 24 * 30, token_id),
        "token_type": "bearer",
    }


async def current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(
            credentials.credentials, get_settings().jwt_secret, algorithms=["HS256"]
        )
        if payload.get("type") != "access":
            raise ValueError
        user = await db.get(User, payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        user = None
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authentication")
    return user
