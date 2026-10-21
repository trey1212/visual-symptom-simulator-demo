package storage

import (
	"context"
	"database/sql"

	"github.com/lib/pq"

	"github.com/visual-symptom-simulator/backend/internal/symptoms"
)

type SymptomsRepository interface {
	ListSymptoms(ctx context.Context) ([]*symptoms.Symptom, error)
	GetSymptomsByKeys(ctx context.Context, keys []string) ([]*symptoms.Symptom, error)
}

type PostgresSymptomsRepo struct {
	db *PostgresDB
}

func NewPostgresSymptomsRepo(db *PostgresDB) *PostgresSymptomsRepo {
	return &PostgresSymptomsRepo{db: db}
}

var _ SymptomsRepository = (*PostgresSymptomsRepo)(nil)

// ListSymptoms retrieves all symptoms from the database to display them
func (repo *PostgresSymptomsRepo) ListSymptoms(ctx context.Context) ([]*symptoms.Symptom, error) {
	query := `
		SELECT key, clinical_name, plain_name, drawable
		FROM symptom_types
		ORDER BY key
	`
	rows, err := repo.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanSymptoms(rows)
}

// Gets a list of symptoms by their keys, used for exporting
func (repo *PostgresSymptomsRepo) GetSymptomsByKeys(ctx context.Context, keys []string) ([]*symptoms.Symptom, error) {
	if len(keys) == 0 {
		return []*symptoms.Symptom{}, nil
	}

	query := `
		SELECT key, clinical_name, plain_name, drawable
		FROM symptom_types
		WHERE key = ANY($1)
		ORDER BY key
	`
	rows, err := repo.db.QueryContext(ctx, query, pq.Array(keys))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanSymptoms(rows)
}

// Helper function to scan rows into a slice of Symptom structs
func scanSymptoms(rows *sql.Rows) ([]*symptoms.Symptom, error) {
	result := []*symptoms.Symptom{}
	for rows.Next() {
		var s symptoms.Symptom
		if err := rows.Scan(&s.Key, &s.ClinicalName, &s.PlainName, &s.Drawable); err != nil {
			return nil, err
		}
		result = append(result, &s)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return result, nil
}
