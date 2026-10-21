package storage

//offload for now, get symtpoms, sessions and scenes working

import (
	"context"

	"github.com/google/uuid"

	"github.com/visual-symptom-simulator/backend/internal/auth"
)

type UserRepository interface {
	CreateUser(ctx context.Context, user *auth.User) error
	GetUser(ctx context.Context, id uuid.UUID) (*auth.User, error)
	UpdateUser(ctx context.Context, user *auth.User) error
	DeleteUser(ctx context.Context, id uuid.UUID) error
}

type PostgresUserRepo struct {
	db *PostgresDB
}

func NewPostgresUserRepo(db *PostgresDB) *PostgresUserRepo {
	return &PostgresUserRepo{db: db}
}

var _ UserRepository = (*PostgresUserRepo)(nil)

// CreateUser inserts a new user into the database when registering
func (repo *PostgresUserRepo) CreateUser(ctx context.Context, user *auth.User) error {
	query := `
		INSERT INTO users (email, password_hash, role, first_name, last_name, hospital)
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := repo.db.ExecContext(ctx, query, user.Email, user.PasswordHash, user.Role, user.FirstName, user.LastName, user.Hospital)
	return err
}

// GetUser retrieves a user by their ID
func (repo *PostgresUserRepo) GetUser(ctx context.Context, id uuid.UUID) (*auth.User, error) {
	query := `
		SELECT id, email, password_hash, role, first_name, last_name, hospital
		FROM users
		WHERE id = $1
	`
	user := &auth.User{}
	err := repo.db.QueryRowContext(ctx, query, id).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Role, &user.FirstName, &user.LastName, &user.Hospital)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// UpdateUser edits the user's information
func (repo *PostgresUserRepo) UpdateUser(ctx context.Context, user *auth.User) error {
	query := `
		UPDATE users 
		SET email = $1, password_hash = $2, role = $3, first_name = $4, last_name = $5, hospital = $6
		WHERE id = $7
	`
	_, err := repo.db.ExecContext(
		ctx,
		query,
		user.Email,
		user.PasswordHash,
		user.Role,
		user.FirstName,
		user.LastName,
		user.Hospital,
		user.ID,
	)
	return err
}

// DeleteUser removes a user from the database by their ID
func (repo *PostgresUserRepo) DeleteUser(ctx context.Context, id uuid.UUID) error {
	query := `
		DELETE FROM users 
		WHERE id = $1
	`
	_, err := repo.db.ExecContext(ctx, query, id)
	return err
}
