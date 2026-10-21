package storage

import (
	"context"

	"github.com/google/uuid"

	"github.com/visual-symptom-simulator/backend/internal/scenes"
)

type ScenesRepository interface {
	GetScene(ctx context.Context, sceneID uuid.UUID) (*scenes.Scene, error)
	ListScenes(ctx context.Context) ([]*scenes.Scene, error)
}

type PostgresScenesRepo struct {
	db *PostgresDB
}

func NewPostgresScenesRepo(db *PostgresDB) *PostgresScenesRepo {
	return &PostgresScenesRepo{db: db}
}

var _ ScenesRepository = (*PostgresScenesRepo)(nil)

// GetScene gets the currently selected scene for exporting
func (repo *PostgresScenesRepo) GetScene(ctx context.Context, sceneID uuid.UUID) (*scenes.Scene, error) {
	query := `
		SELECT id, name, type, asset_path, is_active, created_at
		FROM scenes
		WHERE id = $1
	`
	var s scenes.Scene
	err := repo.db.QueryRowContext(ctx, query, sceneID).Scan(
		&s.ID,
		&s.Name,
		&s.Type,
		&s.AssetPath,
		&s.IsActive,
		&s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// ListScenes shows all the available scenes
func (repo *PostgresScenesRepo) ListScenes(ctx context.Context) ([]*scenes.Scene, error) {
	query := `
		SELECT id, name, type, asset_path, is_active, created_at
		FROM scenes
		WHERE is_active = true
		ORDER BY name
	`
	rows, err := repo.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []*scenes.Scene{}
	for rows.Next() {
		var s scenes.Scene
		if err := rows.Scan(
			&s.ID,
			&s.Name,
			&s.Type,
			&s.AssetPath,
			&s.IsActive,
			&s.CreatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}
