import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

# --- Alembic config & logging ---
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- Import metadata z modeli ---
# Upewnij się, że pakiet "app" jest importowalny (jeśli trzeba, dodaj ścieżkę)
# sys.path.append(os.path.dirname(os.path.abspath(__file__)))  # zwykle niepotrzebne
from app.models import Base  # <- DOPASUJ, jeśli Base jest w innym module

target_metadata = Base.metadata

# --- Źródło URL do bazy ---
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    # sensowny default dla lokalnego dev (zmień jeśli masz inny)
    "postgresql://postgres:postgres@localhost:5432/notatnik",
)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = create_engine(DATABASE_URL, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
