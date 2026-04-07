import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DEFAULT_SQLITE_PATH = (
    "/tmp/resilience_hub.db"
    if os.getenv("VERCEL")
    else (Path(__file__).resolve().parents[1] / "resilience_hub.db").as_posix()
)
DEFAULT_SQLITE_URL = f"sqlite:///{DEFAULT_SQLITE_PATH}"


def _env(primary: str, default: str = "", *aliases: str) -> str:
    """Read env var by primary key, then fall back to aliases."""
    keys = (primary, *aliases)
    for key in keys:
        value = os.getenv(key)
        if value is not None:
            return value
    return default


class Settings(BaseSettings):
    """Application settings"""
    
    # Database Configuration
    use_postgres: bool = _env("use_postgres", "false", "USE_POSTGRES").lower() == "true"
    database_url: str = _env("database_url", DEFAULT_SQLITE_URL, "DATABASE_URL")
    sqlalchemy_database_url: str = _env("sqlalchemy_database_url", DEFAULT_SQLITE_URL, "SQLALCHEMY_DATABASE_URL")
    
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
    openai_api_key: str = _env("openai_api_key", "", "OPENAI_API_KEY")
    openai_model: str = "gpt-4"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 2000
    
    # External API Keys
    openweather_api_key: str = _env("openweather_api_key", "", "OPENWEATHER_API_KEY")
    nasa_firms_api_key: str = _env("nasa_firms_api_key", "", "NASA_FIRMS_API_KEY")
    nasa_api_key: str = _env("nasa_api_key", "", "NASA_API_KEY")
    data_gov_in_api_key: str = _env("data_gov_in_api_key", "", "DATA_GOV_IN_API_KEY")
    data_gov_in_resource_id: str = _env("data_gov_in_resource_id", "", "DATA_GOV_IN_RESOURCE_ID")
    noaa_api_token: str = _env("noaa_api_token", "", "NOAA_API_TOKEN")
    noaa_dataset_id: str = _env("noaa_dataset_id", "", "NOAA_DATASET_ID")
    noaa_location_id: str = _env("noaa_location_id", "", "NOAA_LOCATION_ID")
    imd_api_key: str = _env("imd_api_key", "", "IMD_API_KEY")
    ndma_api_key: str = _env("ndma_api_key", "", "NDMA_API_KEY")
    sms_provider: str = _env("sms_provider", "mock", "SMS_PROVIDER")
    twilio_account_sid: str = _env("twilio_account_sid", "", "TWILIO_ACCOUNT_SID")
    twilio_auth_token: str = _env("twilio_auth_token", "", "TWILIO_AUTH_TOKEN")
    twilio_from_number: str = _env("twilio_from_number", "", "TWILIO_FROM_NUMBER")
    weather_gov_user_agent: str = _env("weather_gov_user_agent", "drs-resilience-hub/1.0", "WEATHER_GOV_USER_AGENT")
    usgs_geojson_feed_url: str = _env(
        "usgs_geojson_feed_url",
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        "USGS_GEOJSON_FEED_URL",
    )
    openfema_disaster_feed_url: str = _env(
        "openfema_disaster_feed_url",
        "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$top=50",
        "OPENFEMA_DISASTER_FEED_URL",
    )
    sachet_ndma_feed_url: str = _env(
        "sachet_ndma_feed_url",
        "https://sachet.ndma.gov.in/",
        "SACHET_NDMA_FEED_URL",
    )
    nasa_eonet_feed_url: str = _env(
        "nasa_eonet_feed_url",
        "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50",
        "NASA_EONET_FEED_URL",
    )
    google_client_id: str = _env("google_client_id", "", "GOOGLE_CLIENT_ID")
    
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

