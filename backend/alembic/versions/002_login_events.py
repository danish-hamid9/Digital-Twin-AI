"""login events table

Revision ID: 002_login_events
Revises: 001_initial_schema
Create Date: 2026-10-06 18:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_login_events'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'login_events',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('method', sa.String(50), nullable=False, server_default='password'),
        sa.Column('browser_os', sa.String(255), nullable=False, server_default='Unknown'),
        sa.Column('ip_address', sa.String(100), nullable=False, server_default=''),
    )
    op.create_index('ix_login_events_user_id', 'login_events', ['user_id'])
    op.create_index('ix_login_events_created_at', 'login_events', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_login_events_created_at', table_name='login_events')
    op.drop_index('ix_login_events_user_id', table_name='login_events')
    op.drop_table('login_events')
