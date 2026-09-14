"""
Application Configuration Module.
Loads environment variables and configuration settings using Pydantic Settings.
"""

from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings class loaded from environment variables and .env file."""

    PROJECT_NAME: str = "Secure Enterprise VPN"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database Configuration
    DATABASE_URL: str = "postgresql://vpnuser:vpnpassword123@localhost:5432/vpndb"

    # Security & JWT Configuration
    SECRET_KEY: str = "supersecretkeyforvpnauthenticationandauthorizationmicrosegmentation"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # WireGuard Configuration
    WIREGUARD_INTERFACE: str = "wg0"
    WIREGUARD_SERVER_IP: str = "10.10.0.1"
    WIREGUARD_SERVER_PORT: int = 51820
    WIREGUARD_NETWORK: str = "10.10.0.0/24"
    WIREGUARD_CONFIG_DIR: str = "/etc/wireguard"
    WIREGUARD_SERVER_PUBLIC_KEY: str = ""
    WIREGUARD_ENDPOINT_HOST: str = "10.0.2.15"

    # Cross-Origin Resource Sharing (CORS)
    CORS_ORIGINS: Union[str, List[str]] = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list of strings."""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
        return self.CORS_ORIGINS

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
