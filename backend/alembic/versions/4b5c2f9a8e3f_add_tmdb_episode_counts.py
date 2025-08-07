"""Add TMDB episode count fields

Revision ID: 4b5c2f9a8e3f
Revises: 3a2a2d7c35e6
Create Date: 2025-01-07 02:56:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '4b5c2f9a8e3f'
down_revision = '3a2a2d7c35e6'
branch_labels = None
depends_on = None


def upgrade():
    # Add TMDB episode count fields to tv_shows table
    op.add_column('tv_shows', sa.Column('tmdb_total_episodes', sa.Integer(), default=0))
    op.add_column('tv_shows', sa.Column('tmdb_season_count', sa.Integer(), default=0))
    
    # Add TMDB episode count field to seasons table
    op.add_column('seasons', sa.Column('tmdb_episode_count', sa.Integer(), default=0))


def downgrade():
    # Remove the added columns
    op.drop_column('tv_shows', 'tmdb_total_episodes')
    op.drop_column('tv_shows', 'tmdb_season_count')
    op.drop_column('seasons', 'tmdb_episode_count')
