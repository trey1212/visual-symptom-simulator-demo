package storage

import (
	"database/sql"

	_ "github.com/jackc/pgx/v5/stdlib"
) 

type PostgresDB struct {
	*sql.DB
}

func NewPostgresDB(connString string) (*PostgresDB, error) {
	db, err := sql.Open("pgx", connString)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return &PostgresDB{db}, nil
}