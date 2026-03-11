from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, field_validator
import httpx
from app.models import UserRole

from app.database import get_db
from app.models import User
from app.config import settings
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    oauth2_scheme,
    get_token_payload,
    get_allowed_mission_roles,
    get_default_mission_role,
)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "citizen"


class RoleSwitchRequest(BaseModel):
    mission_role: str


class GoogleAuthRequest(BaseModel):
    id_token: str
    mission_role: str | None = None

    @field_validator("id_token")
    @classmethod
    def validate_id_token(cls, value: str) -> str:
        if not value or len(value.strip()) < 20:
            raise ValueError("Invalid Google ID token")
        return value.strip()


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Convert string role to enum
    try:
        user_role = UserRole(req.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {req.role}")

    new_user = User(
        name=req.name,
        email=req.email,
        hashed_password=hash_password(req.password),
        role=user_role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered successfully"}


@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    allowed_roles = get_allowed_mission_roles(role_value)
    mission_role = get_default_mission_role(role_value)

    token = create_access_token(
        {
            "user_id": user.id,
            "user_role": role_value,
            "mission_role": mission_role,
            "allowed_mission_roles": allowed_roles,
        }
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": role_value,
            "mission_role": mission_role,
            "allowed_mission_roles": allowed_roles,
        },
    }


@router.get("/me")
def get_session_me(current_user: User = Depends(get_current_user), token: str = Depends(oauth2_scheme)):
    payload = get_token_payload(token)
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": role_value,
        "mission_role": payload.get("mission_role", get_default_mission_role(role_value)),
        "allowed_mission_roles": payload.get("allowed_mission_roles", get_allowed_mission_roles(role_value)),
    }


@router.post("/switch-role")
def switch_mission_role(
    request: RoleSwitchRequest,
    current_user: User = Depends(get_current_user),
):
    role_value = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    allowed_roles = get_allowed_mission_roles(role_value)

    if request.mission_role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Mission role '{request.mission_role}' not permitted for user role '{role_value}'",
        )

    new_token = create_access_token(
        {
            "user_id": current_user.id,
            "user_role": role_value,
            "mission_role": request.mission_role,
            "allowed_mission_roles": allowed_roles,
        }
    )

    return {
        "access_token": new_token,
        "token_type": "bearer",
        "mission_role": request.mission_role,
        "allowed_mission_roles": allowed_roles,
    }


@router.post("/google")
async def google_login(request: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": request.id_token},
            )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Google verification unavailable: {exc}")

    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    payload = response.json()
    email = (payload.get("email") or "").strip().lower()
    name = (payload.get("name") or "Google Operator").strip()
    aud = payload.get("aud")
    email_verified = str(payload.get("email_verified", "false")).lower() == "true"
    sub = payload.get("sub", "")

    if not email or not email_verified:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    if settings.google_client_id and aud != settings.google_client_id:
        raise HTTPException(status_code=401, detail="Google token audience mismatch")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password(f"google::{sub}"),
            role=UserRole.CITIZEN,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    role_value = user.role.value if hasattr(user.role, "value") else str(user.role)
    allowed_roles = get_allowed_mission_roles(role_value)
    mission_role = request.mission_role or get_default_mission_role(role_value)
    if mission_role not in allowed_roles:
        mission_role = get_default_mission_role(role_value)

    token = create_access_token(
        {
            "user_id": user.id,
            "user_role": role_value,
            "mission_role": mission_role,
            "allowed_mission_roles": allowed_roles,
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": role_value,
            "mission_role": mission_role,
            "allowed_mission_roles": allowed_roles,
        },
    }
