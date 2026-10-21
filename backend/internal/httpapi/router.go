// Package httpapi wires HTTP routes to handlers using the standard library mux.
/* I'll eventually put things into their own files cause router.go will
   become bloated -trey */
package httpapi

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"log" //remove when debugging is done
	"net/http"
	"os"
	"path/filepath"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/visual-symptom-simulator/backend/internal/auth"
	"github.com/visual-symptom-simulator/backend/internal/sessions"
	"github.com/visual-symptom-simulator/backend/internal/storage"
)

// Repository struct that holds all the repos for the API
type Repositories struct {
	Sessions      storage.SessionsRepository
	Scenes        storage.ScenesRepository
	Symptoms      storage.SymptomsRepository
	Users         storage.UserRepository
	AssetDir      string    // where the scene files are, ex. "./data"
	DefaultUserID uuid.UUID // remove when auth is done
	//other repos when they're done
}

// maxBodyBytes caps request bodies (maybe remove if needed))
const maxBodyBytes = 4 << 20 // 4 MiB

// Postgres error codes
const (
	pgForeignKeyViolation = "23503"
	pgUniqueViolation     = "23505"
)

func NewRouter(repos *Repositories) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Planned routes (see DESIGN.md):
	//   POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me
	//   GET  /api/symptoms, GET /api/images, GET /api/images/{id}

	// /* Auth APIs */
	mux.HandleFunc("POST /api/auth/register", func(w http.ResponseWriter, r *http.Request) {
		var user auth.User
		if !decodeJSON(w, r, &user) {
			return
		}

		// Note: Ensure user.PasswordHash is properly hashed
		if err := repos.Users.CreateUser(r.Context(), &user); err != nil {
			if isPgCode(err, pgUniqueViolation) {
				writeError(w, http.StatusConflict, "email already in use")
				return
			}
			serverError(w, "create user", err)
			return
		}

		user.PasswordHash = "" // Never send password hash back to the client
		writeJSON(w, http.StatusCreated, user)
	})

	// Login (Not done yet)
	mux.HandleFunc("POST /api/auth/login", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Parse credentials, fetch user by email, compare password hash, and set session cookie/token
		writeError(w, http.StatusNotImplemented, "login not fully implemented yet")
	})

	// Logout (Not done yet)
	mux.HandleFunc("POST /api/auth/logout", func(w http.ResponseWriter, r *http.Request) {
		// TODO: Clear session cookie/token
		writeJSON(w, http.StatusOK, map[string]string{"message": "logged out successfully"})
	})

	// Get logged in user profile
	mux.HandleFunc("GET /api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		userID := currentUserID(r, repos.DefaultUserID)

		user, err := repos.Users.GetUser(r.Context(), userID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "user not found")
				return
			}
			serverError(w, "get user", err)
			return
		}

		user.PasswordHash = "" // Hide password hash
		writeJSON(w, http.StatusOK, user)
	})

	// Update logged in user profile
	mux.HandleFunc("PUT /api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		userID := currentUserID(r, repos.DefaultUserID)

		var user auth.User
		if !decodeJSON(w, r, &user) {
			return
		}

		// Make ID to the currently logged in user ID
		user.ID = userID

		if err := repos.Users.UpdateUser(r.Context(), &user); err != nil {
			if isPgCode(err, pgUniqueViolation) {
				writeError(w, http.StatusConflict, "email already in use")
				return
			}
			serverError(w, "update user", err)
			return
		}

		user.PasswordHash = "" // Hide password hash
		writeJSON(w, http.StatusOK, user)
	})

	// Delete logged in user account (this will change to a button in the me page)
	mux.HandleFunc("DELETE /api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		userID := currentUserID(r, repos.DefaultUserID)

		if err := repos.Users.DeleteUser(r.Context(), userID); err != nil {
			serverError(w, "delete user", err)
			return
		}

		// TODO: Clear session cookie
		writeJSON(w, http.StatusOK, map[string]string{"message": "user deleted successfully"})
	})

	/* Scene APIs */

	// Lists all active scenes (backgrounds) the user can pick from
	mux.HandleFunc("GET /api/scenes", func(w http.ResponseWriter, r *http.Request) {
		list, err := repos.Scenes.ListScenes(r.Context())
		if err != nil {
			serverError(w, "list scenes", err)
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	// Retrieves a single scene by ID
	mux.HandleFunc("GET /api/scenes/{scene_id}", func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := uuid.Parse(r.PathValue("scene_id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid scene ID format")
			return
		}

		scene, err := repos.Scenes.GetScene(r.Context(), sceneID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "scene not found")
				return
			}
			serverError(w, "get scene", err)
			return
		}
		writeJSON(w, http.StatusOK, scene)
	})

	// Sends the actual image or video file for a scene
	// we look it up by the scene id instead of letting the browser send a file path,
	// that way only files that are in the scenes table can be downloaded
	mux.HandleFunc("GET /api/scenes/{scene_id}/file", func(w http.ResponseWriter, r *http.Request) {
		sceneID, err := uuid.Parse(r.PathValue("scene_id"))
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid scene ID format")
			return
		}

		scene, err := repos.Scenes.GetScene(r.Context(), sceneID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "scene not found")
				return
			}
			serverError(w, "get scene", err)
			return
		}

		// hidden scenes (is_active = false) shouldn't be downloadable either
		if !scene.IsActive {
			writeError(w, http.StatusNotFound, "scene not found")
			return
		}

		filePath, ok := sceneFilePath(repos.AssetDir, scene.AssetPath)
		if !ok {
			log.Printf("httpapi: scene %s has a missing or unsafe asset_path %q", scene.ID, scene.AssetPath)
			writeError(w, http.StatusNotFound, "scene file not found")
			return
		}

		// stops the browser from guessing the file type, it has to use the one we send
		w.Header().Set("X-Content-Type-Options", "nosniff")

		// ServeFile sets the content type from the file extension and handles range requests
		// (videos need range requests so you can skip around in them)
		http.ServeFile(w, r, filePath)
	})

	/* Symptom APIs */

	// Lists every symptom type that can be turned on in the simulator
	mux.HandleFunc("GET /api/symptoms", func(w http.ResponseWriter, r *http.Request) {
		list, err := repos.Symptoms.ListSymptoms(r.Context())
		if err != nil {
			serverError(w, "list symptoms", err)
			return
		}
		writeJSON(w, http.StatusOK, list)
	})

	/* Session APIs */
	// Note: should probably move these into their own handler files eventually

	// Creates a new session in the database
	mux.HandleFunc("POST /api/sessions", func(w http.ResponseWriter, r *http.Request) {
		var s sessions.Session

		if !decodeJSON(w, r, &s) {
			return
		}

		//remove when auth is made
		s.UserID = currentUserID(r, repos.DefaultUserID)

		if s.SceneID == uuid.Nil {
			writeError(w, http.StatusBadRequest, "scene_id is required")
			return
		}

		// Access the Sessions repo from the container struct
		if err := repos.Sessions.CreateSession(r.Context(), &s); err != nil {
			if isPgCode(err, pgForeignKeyViolation) {
				writeError(w, http.StatusBadRequest, "scene_id does not match an existing scene")
				return
			}
			serverError(w, "create session", err)
			return
		}

		writeJSON(w, http.StatusCreated, s)
	})

	// Retrieves existing session data from the database
	mux.HandleFunc("GET /api/sessions/{session_id}", func(w http.ResponseWriter, r *http.Request) {
		sessionID, ok := parseSessionID(w, r)
		if !ok {
			return
		}

		s, err := repos.Sessions.GetSession(r.Context(), sessionID)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				writeError(w, http.StatusNotFound, "session not found")
				return
			}

			serverError(w, "get session", err)
			return
		}

		writeJSON(w, http.StatusOK, s)
	})

	// Lists all layers in a session (used for exporting)
	mux.HandleFunc("GET /api/sessions/{session_id}/layers", func(w http.ResponseWriter, r *http.Request) {
		sessionID, ok := parseSessionID(w, r)

		if !ok {
			return
		}

		if !sessionExists(w, r, repos.Sessions, sessionID) {
			return
		}

		layers, err := repos.Sessions.ListSessionLayers(r.Context(), sessionID)

		if err != nil {
			serverError(w, "list session layers", err)
			return
		}

		writeJSON(w, http.StatusOK, layers)
	})

	// Adds a new layer to an existing session or updates if same session/symptom/eye combo already exists
	mux.HandleFunc("POST /api/sessions/{session_id}/layers", func(w http.ResponseWriter, r *http.Request) {
		sessionID, ok := parseSessionID(w, r)
		if !ok {
			return
		}

		var layer sessions.SessionLayer

		if !decodeJSON(w, r, &layer) {
			return
		}

		// Ensure the layer is using the correct session ID from URL
		layer.SessionID = sessionID

		if msg := validateLayer(&layer); msg != "" {
			writeError(w, http.StatusBadRequest, msg)
			return
		}

		if !sessionExists(w, r, repos.Sessions, sessionID) {
			return
		}

		if err := repos.Sessions.CreateSessionLayer(r.Context(), &layer); err != nil {
			if isPgCode(err, pgForeignKeyViolation) {
				writeError(w, http.StatusBadRequest, "symptom_key does not match an existing symptom")
				return
			}

			serverError(w, "save layer", err)
			return
		}

		writeJSON(w, http.StatusCreated, layer)
	})

	// Lists all snapshots in a session, in timeline order (used for export)
	mux.HandleFunc("GET /api/sessions/{session_id}/snapshots", func(w http.ResponseWriter, r *http.Request) {
		sessionID, ok := parseSessionID(w, r)

		if !ok {
			return
		}

		if !sessionExists(w, r, repos.Sessions, sessionID) {
			return
		}

		snapshots, err := repos.Sessions.ListSnapshots(r.Context(), sessionID)

		if err != nil {
			serverError(w, "list snapshots", err)
			return
		}

		writeJSON(w, http.StatusOK, snapshots)
	})

	// Creates a new snapshot for an existing session
	mux.HandleFunc("POST /api/sessions/{session_id}/snapshots", func(w http.ResponseWriter, r *http.Request) {
		sessionID, ok := parseSessionID(w, r)

		if !ok {
			return
		}

		var snapshot sessions.Snapshot

		if !decodeJSON(w, r, &snapshot) {
			return
		}

		// Ensure the snapshot is using the correct session ID from URL
		snapshot.SessionID = sessionID

		if snapshot.MinutesFromStart < 0 {
			writeError(w, http.StatusBadRequest, "minutes_from_start must be >= 0")
			return
		}

		if !sessionExists(w, r, repos.Sessions, sessionID) {
			return
		}

		// If the client didn't send any layers, freeze the session's current layer
		if len(snapshot.Layers) == 0 || bytes.Equal(snapshot.Layers, []byte("null")) {
			current, err := repos.Sessions.ListSessionLayers(r.Context(), sessionID)

			if err != nil {
				serverError(w, "load layers for snapshot", err)
				return
			}

			frozen, err := json.Marshal(current)

			if err != nil {
				serverError(w, "encode layers for snapshot", err)
				return
			}
			snapshot.Layers = frozen
		}

		if err := repos.Sessions.CreateSnapshot(r.Context(), &snapshot); err != nil {
			if isPgCode(err, pgUniqueViolation) {
				writeError(w, http.StatusConflict, "a snapshot already exists at that minute for this session")
				return
			}

			serverError(w, "save snapshot", err)
			return
		}

		writeJSON(w, http.StatusCreated, snapshot)
	})

	return mux
}

/* Helper functions */
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// writeError sends a consistent error message
func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// serverError logs the error and displays it then sends a generic 500 to the client to avoid data leaks
func serverError(w http.ResponseWriter, action string, err error) {
	log.Printf("httpapi: %s: %v", action, err)
	writeError(w, http.StatusInternalServerError, "failed to "+action)
}

// decodeJSON reads the request body and decodes it
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var maxBytes *http.MaxBytesError

		if errors.As(err, &maxBytes) {
			writeError(w, http.StatusRequestEntityTooLarge, "request body too large")
			return false
		}

		writeError(w, http.StatusBadRequest, "invalid JSON payload")
		return false
	}
	return true
}

// parseSessionID pulls and validates session_id
func parseSessionID(w http.ResponseWriter, r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(r.PathValue("session_id"))

	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid session ID format")
		return uuid.Nil, false
	}
	return id, true
}

// sessionExists checks if a session exists, true if it does otherwise false
func sessionExists(w http.ResponseWriter, r *http.Request, repo storage.SessionsRepository, id uuid.UUID) bool {
	if _, err := repo.GetSession(r.Context(), id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeError(w, http.StatusNotFound, "session not found")
		} else {
			serverError(w, "get session", err)
		}
		return false
	}
	return true
}

// validateLayer mirrors the DB constraints and bad inputs give a proper error message
func validateLayer(l *sessions.SessionLayer) string {
	if l.SymptomKey == "" {
		return "symptom_key is required"
	}

	if l.Eye != "left" && l.Eye != "right" {
		return `eye must be "left" or "right"`
	}

	if l.Intensity < 0 || l.Intensity > 100 {
		return "intensity must be between 0 and 100"
	}
	return ""
}

// currentUserID returns the user making the request
// replace with authenticated user when auth is done
func currentUserID(r *http.Request, fallback uuid.UUID) uuid.UUID {
	return fallback
}

// isPgCode reports whether err is a Postgres error with the given SQLSTATE code
func isPgCode(err error, code string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == code
}

// sceneFilePath turns a scene's asset_path (ex. "images/park.jpg") into the real path
// inside assetDir. returns false if the path tries to go outside of assetDir
// (ex. "../.env"), if it's a folder, or if the file doesn't exist
func sceneFilePath(assetDir string, assetPath string) (string, bool) {
	relPath := filepath.FromSlash(assetPath)

	// IsLocal returns false for empty paths, absolute paths and paths that use ".." to get out
	if !filepath.IsLocal(relPath) {
		return "", false
	}

	fullPath := filepath.Join(assetDir, relPath)

	// only send actual files, not folders (sending a folder would list everything inside it)
	info, err := os.Stat(fullPath)
	if err != nil || !info.Mode().IsRegular() {
		return "", false
	}

	return fullPath, true
}
