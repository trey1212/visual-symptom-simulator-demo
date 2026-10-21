package storage

import (
	"context"

	"github.com/google/uuid"

	"github.com/visual-symptom-simulator/backend/internal/sessions"
)

type SessionsRepository interface {
	CreateSession(ctx context.Context, session *sessions.Session) error
	GetSession(ctx context.Context, sessionID uuid.UUID) (*sessions.Session, error)
	CreateSessionLayer(ctx context.Context, layer *sessions.SessionLayer) error
	ListSessionLayers(ctx context.Context, sessionID uuid.UUID) ([]*sessions.SessionLayer, error)
	CreateSnapshot(ctx context.Context, snapshot *sessions.Snapshot) error
	ListSnapshots(ctx context.Context, sessionID uuid.UUID) ([]*sessions.Snapshot, error)
}

type PostgresSessionsRepo struct {
	db *PostgresDB
}

func NewPostgresSessionsRepo(db *PostgresDB) *PostgresSessionsRepo {
	return &PostgresSessionsRepo{db: db}
}

var _ SessionsRepository = (*PostgresSessionsRepo)(nil)

// CreateSession inserts a new run and updates the struct with default values
func (repo *PostgresSessionsRepo) CreateSession(ctx context.Context, session *sessions.Session) error {
	query := `
		INSERT INTO sessions (user_id, scene_id)
		VALUES ($1, $2)
		RETURNING id, started_at, completed_at
	`
	// here in case there's no user being seeded
	// query := `
	// 	INSERT INTO sessions (scene_id)
	// 	VALUES ($1)
	// 	RETURNING id, started_at, completed_at
	// `

	err := repo.db.QueryRowContext(
		ctx,
		query,
		session.UserID,
		session.SceneID,
	).Scan(
		&session.ID,
		&session.StartedAt,
		&session.CompletedAt,
	)

	return err
}

// GetSession gets a session by its ID and returns it for exporting
func (repo *PostgresSessionsRepo) GetSession(ctx context.Context, sessionID uuid.UUID) (*sessions.Session, error) {
	query := `
		SELECT id, user_id, scene_id, started_at, completed_at
		FROM sessions
		WHERE id = $1
	`

	// here in case no user is being seeded
	// query := `
	// 	SELECT id, scene_id, started_at, completed_at
	// 	FROM sessions
	// 	WHERE id = $1
	// `

	var s sessions.Session
	err := repo.db.QueryRowContext(ctx, query, sessionID).Scan(
		&s.ID,
		&s.UserID,
		&s.SceneID,
		&s.StartedAt,
		&s.CompletedAt,
	)
	if err != nil {
		return nil, err
	}

	return &s, nil
}

// CreateSessionLayer inserts a symptom layer for one eye in a session
// If a layer for the same session, symptom, or eye already exists, update instead
func (repo *PostgresSessionsRepo) CreateSessionLayer(ctx context.Context, layer *sessions.SessionLayer) error {
	query := `
		INSERT INTO session_layers (session_id, symptom_key, eye, intensity, params, drawn_strokes)
		VALUES ($1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb), COALESCE($6::jsonb, '[]'::jsonb))
		ON CONFLICT (session_id, symptom_key, eye) DO UPDATE
		SET intensity     = EXCLUDED.intensity,
		    params        = EXCLUDED.params,
		    drawn_strokes = EXCLUDED.drawn_strokes,
		    updated_at    = now()
		RETURNING id, updated_at
	`

	err := repo.db.QueryRowContext(
		ctx,
		query,
		layer.SessionID,
		layer.SymptomKey,
		layer.Eye,
		layer.Intensity,
		layer.Params,
		layer.DrawnStrokes,
	).Scan(
		&layer.ID,
		&layer.UpdatedAt,
	)

	return err
}

// ListSessionLayers returns all symptom layers for a session for exporting
func (repo *PostgresSessionsRepo) ListSessionLayers(ctx context.Context, sessionID uuid.UUID) ([]*sessions.SessionLayer, error) {
	query := `
		SELECT id, session_id, symptom_key, eye, intensity, params, drawn_strokes, updated_at
		FROM session_layers
		WHERE session_id = $1
		ORDER BY updated_at
	`

	rows, err := repo.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []*sessions.SessionLayer{}
	for rows.Next() {
		var l sessions.SessionLayer
		if err := rows.Scan(
			&l.ID,
			&l.SessionID,
			&l.SymptomKey,
			&l.Eye,
			&l.Intensity,
			&l.Params,
			&l.DrawnStrokes,
			&l.UpdatedAt,
		); err != nil {
			return nil, err
		}
		result = append(result, &l)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	return result, nil
}

// CreateSnapshot inserts a snapshot of the session
func (repo *PostgresSessionsRepo) CreateSnapshot(ctx context.Context, snapshot *sessions.Snapshot) error {
	query := `
		INSERT INTO snapshots (session_id, minutes_from_start, label, layers, image_path)
		VALUES ($1, $2, $3, COALESCE($4::jsonb, '[]'::jsonb), $5)
		RETURNING id, captured_at
	`

	err := repo.db.QueryRowContext(
		ctx,
		query,
		snapshot.SessionID,
		snapshot.MinutesFromStart,
		snapshot.Label,
		snapshot.Layers,
		snapshot.ImagePath,
	).Scan(
		&snapshot.ID,
		&snapshot.CapturedAt,
	)

	return err
}

// ListSnapshots returns all snapshots for a session in timeline order for exporting
func (repo *PostgresSessionsRepo) ListSnapshots(ctx context.Context, sessionID uuid.UUID) ([]*sessions.Snapshot, error) {
	query := `
		SELECT id, session_id, minutes_from_start, label, layers, image_path, captured_at
		FROM snapshots
		WHERE session_id = $1
		ORDER BY minutes_from_start
	`

	rows, err := repo.db.QueryContext(ctx, query, sessionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := []*sessions.Snapshot{}
	for rows.Next() {
		var s sessions.Snapshot
		if err := rows.Scan(
			&s.ID,
			&s.SessionID,
			&s.MinutesFromStart,
			&s.Label,
			&s.Layers,
			&s.ImagePath,
			&s.CapturedAt,
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
