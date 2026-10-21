package main

import (
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	"github.com/joho/godotenv"

	"github.com/visual-symptom-simulator/backend/internal/config"
	"github.com/visual-symptom-simulator/backend/internal/httpapi"
	"github.com/visual-symptom-simulator/backend/internal/storage"
)

func main() {
	// Path is relative to where you run `go run` (the backend folder),
	// so this points at the .env in the project root one level up.
	if err := godotenv.Load("../.env"); err != nil {
		log.Printf("no .env loaded: %v", err)
	}

	cfg := config.Load()

	dbURL := os.Getenv("POSTGRES_URL")
	if dbURL == "" {
		log.Fatal("POSTGRES_URL is not set")
	}

	// remove this when auth is finished
	seedUserID, err := uuid.Parse(os.Getenv("SEED_USER_ID"))
	if err != nil {
		log.Fatalf("SEED_USER_ID must be a valid UUID: %v", err)
	}

	db, err := storage.NewPostgresDB(dbURL)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer db.Close()

	repos := &httpapi.Repositories{
		Sessions:      storage.NewPostgresSessionsRepo(db),
		Scenes:        storage.NewPostgresScenesRepo(db),
		Symptoms:      storage.NewPostgresSymptomsRepo(db),
		AssetDir:      cfg.AssetDir,
		DefaultUserID: seedUserID, // remove when auth is finished
	}

	log.Printf("listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, httpapi.NewRouter(repos)); err != nil {
		log.Fatal(err)
	}
}
