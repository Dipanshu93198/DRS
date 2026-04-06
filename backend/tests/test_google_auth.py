from fastapi.testclient import TestClient

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import User


client = TestClient(app)


def test_google_mock_login_creates_user_and_uses_allowed_role():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    db.query(User).filter(User.email == "demo.google@aegis.local").delete()
    db.commit()
    db.close()

    response = client.post(
        "/auth/google",
        json={
            "id_token": "mock_google_token_for_testing",
            "mission_role": "admin",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user"]["email"] == "demo.google@aegis.local"
    assert payload["user"]["role"] == "citizen"
    assert payload["user"]["mission_role"] == "analyst"
    assert "access_token" in payload


def test_google_config_reports_missing_client_id_when_blank():
    original_client_id = settings.google_client_id
    settings.google_client_id = " "

    try:
        response = client.get("/auth/google/config")
    finally:
        settings.google_client_id = original_client_id

    assert response.status_code == 200
    assert response.json() == {
        "client_id": None,
        "configured": False,
    }


def test_google_config_returns_client_id_from_backend_settings():
    original_client_id = settings.google_client_id
    settings.google_client_id = "test-client-id.apps.googleusercontent.com"

    try:
        response = client.get("/auth/google/config")
    finally:
        settings.google_client_id = original_client_id

    assert response.status_code == 200
    assert response.json() == {
        "client_id": "test-client-id.apps.googleusercontent.com",
        "configured": True,
    }
