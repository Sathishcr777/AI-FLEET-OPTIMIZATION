import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "FleetIQ - AI Fleet Intelligence"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    ENVIRONMENT: str = "development"

    # Server Settings
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    # Database Settings
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "fleetiq_db"
    POSTGRES_USER: str = "fleetiq_user"
    POSTGRES_PASSWORD: str = "fleetiq_password"
    DATABASE_URL: str = "postgresql+asyncpg://fleetiq_user:fleetiq_password@localhost:5432/fleetiq_db"
    SYNC_DATABASE_URL: str = "postgresql://fleetiq_user:fleetiq_password@localhost:5432/fleetiq_db"

    # MQTT Settings
    MQTT_BROKER_HOST: str = "localhost"
    MQTT_BROKER_PORT: int = 1883
    MQTT_WS_PORT: int = 9001
    MQTT_CLIENT_ID: str = "fleetiq_backend_ingest"
    MQTT_TELEMETRY_TOPIC: str = "fleetiq/telemetry/#"
    MQTT_ALERTS_TOPIC: str = "fleetiq/alerts/#"

    # Simulator & Analytics Thresholds
    SIMULATOR_NUM_VEHICLES: int = 5
    SIMULATOR_UPDATE_INTERVAL_SEC: float = 1.0
    ANOMALY_CONFIDENCE_THRESHOLD: float = 0.75
    MAINTENANCE_RISK_HIGH_THRESHOLD: float = 0.70

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
