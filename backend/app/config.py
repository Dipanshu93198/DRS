import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    use_postgres: bool = os.getenv("use_postgres", "false").lower() == "true"
    database_url: str = os.getenv("database_url", "sqlite:///./resilience_hub.db")
    sqlalchemy_database_url: str = os.getenv("sqlalchemy_database_url", "sqlite:///./resilience_hub.db")
    
    # API Configuration
    api_title: str = "Disaster Response and Coordination System"
    api_version: str = "1.0.0"
    api_description: str = "Real-time disaster response, resource tracking and coordination system"
    
    # CORS Configuration
    cors_origins: str = '["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"]'
    
    # Server Configuration
    server_host: str = "0.0.0.0"
    server_port: int = 8000
    
    # OpenAI Configuration
    openai_api_key: str = os.getenv("openai_api_key", "")
    openai_model: str = "gpt-4"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 2000
    
    # External API Keys
    openweather_api_key: str = os.getenv("openweather_api_key", "")
    nasa_firms_api_key: str = os.getenv("nasa_firms_api_key", "")
    
    # AI Configuration
    ai_system_prompt: str = """You are an AI Emergency Response Assistant for disaster management. 
    You help emergency responders and civilians by:
    1. Explaining disasters and their immediate impacts
    2. Recommending safe actions for civilians
    3. Prioritizing resource dispatch
    4. Providing tactical guidance to responders
    
    Always prioritize safety and clarity. Be concise but comprehensive."""
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

