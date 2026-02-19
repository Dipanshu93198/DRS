import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # Use SQLite for demo/dev, PostgreSQL for production
    USE_POSTGRES: bool = os.getenv("USE_POSTGRES", "false").lower() == "true"
    
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./resilience_hub.db" if not USE_POSTGRES else "postgresql://postgres:postgres@localhost/resilience_hub"
    )
    SQLALCHEMY_DATABASE_URL: str = os.getenv(
        "SQLALCHEMY_DATABASE_URL",
        "sqlite:///./resilience_hub.db" if not USE_POSTGRES else "postgresql+psycopg2://postgres:postgres@localhost/resilience_hub"
    )
    API_TITLE: str = "Disaster Response and Coordination System"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = "Real-time disaster response, resource tracking and coordination system"
    
    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    OPENAI_TEMPERATURE: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    OPENAI_MAX_TOKENS: int = int(os.getenv("OPENAI_MAX_TOKENS", "2000"))
    
    # AI Configuration
    AI_SYSTEM_PROMPT: str = """You are an AI Emergency Response Assistant for disaster management. 
    You help emergency responders and civilians by:
    1. Explaining disasters and their immediate impacts
    2. Recommending safe actions for civilians
    3. Prioritizing resource dispatch
    4. Providing tactical guidance to responders
    
    Always prioritize safety and clarity. Be concise but comprehensive."""
    
    class Config:
        env_file = ".env"


settings = Settings()

