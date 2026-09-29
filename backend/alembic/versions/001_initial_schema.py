"""initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-28 23:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Users
    op.create_table(
        'users',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

    # 2. Profiles
    op.create_table(
        'profiles',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True, server_default=''),
        sa.Column('occupation', sa.String(255), nullable=True, server_default=''),
        sa.Column('currency', sa.String(10), nullable=False, server_default='USD'),
        sa.Column('monthly_target_savings', sa.Float(), nullable=False, server_default='500.0'),
        sa.Column('target_study_hours_week', sa.Float(), nullable=False, server_default='15.0'),
        sa.Column('target_sleep_hours', sa.Float(), nullable=False, server_default='7.5'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'])

    # 3. Finance Entries
    op.create_table(
        'finance_entries',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('type', sa.String(50), nullable=False),
        sa.Column('category', sa.String(100), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('description', sa.String(500), nullable=True, server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_finance_entries_user_date', 'finance_entries', ['user_id', 'date'])

    # 4. Savings Goals
    op.create_table(
        'savings_goals',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('target_amount', sa.Float(), nullable=False),
        sa.Column('current_amount', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_savings_goals_user_id', 'savings_goals', ['user_id'])

    # 5. Study Sessions
    op.create_table(
        'study_sessions',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('subject', sa.String(100), nullable=False),
        sa.Column('hours', sa.Float(), nullable=False),
        sa.Column('score', sa.Float(), nullable=True),
        sa.Column('notes', sa.String(500), nullable=True, server_default=''),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_study_sessions_user_date', 'study_sessions', ['user_id', 'date'])

    # 6. Habit Logs
    op.create_table(
        'habit_logs',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('habit', sa.String(100), nullable=False),
        sa.Column('done', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('sleep_hours', sa.Float(), nullable=False, server_default='7.0'),
        sa.Column('exercise_minutes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mood', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_habit_logs_user_date', 'habit_logs', ['user_id', 'date'])

    # 7. Goals
    op.create_table(
        'goals',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, server_default='general'),
        sa.Column('target_date', sa.Date(), nullable=True),
        sa.Column('is_completed', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_goals_user_id', 'goals', ['user_id'])

    # 8. Twin Snapshots
    op.create_table(
        'twin_snapshots',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('state', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_twin_snapshots_user_date', 'twin_snapshots', ['user_id', 'date'])

    # 9. Predictions
    op.create_table(
        'predictions',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('domain', sa.String(50), nullable=False),
        sa.Column('horizon', sa.String(50), nullable=False),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False, server_default='v1.0.0'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_predictions_user_id', 'predictions', ['user_id'])

    # 10. Simulations
    op.create_table(
        'simulations',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('baseline', sa.JSON(), nullable=False),
        sa.Column('scenario', sa.JSON(), nullable=False),
        sa.Column('result', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_simulations_user_id', 'simulations', ['user_id'])

    # 11. Plans
    op.create_table(
        'plans',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True, server_default=''),
        sa.Column('domain', sa.String(50), nullable=False, server_default='general'),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('due_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_plans_user_id', 'plans', ['user_id'])

    # 12. Chat Messages
    op.create_table(
        'chat_messages',
        sa.Column('id', sa.CHAR(36), primary_key=True),
        sa.Column('user_id', sa.CHAR(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.Text(), nullable=False, server_default=''),
        sa.Column('tool_calls', sa.JSON(), nullable=True),
        sa.Column('tool_results', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_chat_messages_user_id', 'chat_messages', ['user_id'])


def downgrade() -> None:
    op.drop_table('chat_messages')
    op.drop_table('plans')
    op.drop_table('simulations')
    op.drop_table('predictions')
    op.drop_table('twin_snapshots')
    op.drop_table('goals')
    op.drop_table('habit_logs')
    op.drop_table('study_sessions')
    op.drop_table('savings_goals')
    op.drop_table('finance_entries')
    op.drop_table('profiles')
    op.drop_table('users')
