from datetime import datetime, timedelta
import os
from typing import Any, Dict, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


MISSION_ROLE_MAP = {
    "admin": ["admin", "field", "analyst"],
    "government": ["admin", "analyst"],
    "utility_company": ["admin", "field"],
    "rescue": ["field"],
    "police": ["field"],
    "fire_department": ["field"],
    "medical": ["field"],
    "military": ["field"],
    "ngo": ["field", "analyst"],
    "volunteer": ["field"],
    "citizen": ["analyst"],
}


def get_allowed_mission_roles(user_role: str) -> List[str]:
    return MISSION_ROLE_MAP.get(user_role, ["analyst"])


def get_default_mission_role(user_role: str) -> str:
    allowed = get_allowed_mission_roles(user_role)
    return "admin" if "admin" in allowed else allowed[0]


def get_token_payload(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = get_token_payload(token)
    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_mission_roles(*roles: str):
    def checker(token: str = Depends(oauth2_scheme)):
        payload = get_token_payload(token)
        mission_role = payload.get("mission_role")
        if mission_role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires mission role: {', '.join(roles)}")
        return mission_role

    return checker
