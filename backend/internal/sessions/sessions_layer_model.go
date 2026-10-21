package sessions

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type SessionLayer struct {
	ID           uuid.UUID       `json:"id" db:"id"`
	SessionID    uuid.UUID       `json:"session_id" db:"session_id"`
	SymptomKey   string          `json:"symptom_key" db:"symptom_key"`
	Eye          string          `json:"eye" db:"eye"`
	Intensity    int             `json:"intensity" db:"intensity"`
	Params       json.RawMessage `json:"params" db:"params"`
	DrawnStrokes json.RawMessage `json:"drawn_strokes" db:"drawn_strokes"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}