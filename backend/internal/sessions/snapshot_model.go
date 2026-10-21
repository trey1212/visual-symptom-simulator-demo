package sessions

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Snapshot struct {
	ID               uuid.UUID       `json:"id" db:"id"`
	SessionID        uuid.UUID       `json:"session_id" db:"session_id"`
	MinutesFromStart int             `json:"minutes_from_start" db:"minutes_from_start"`
	Label            *string         `json:"label" db:"label"`
	Layers           json.RawMessage `json:"layers" db:"layers"`
	ImagePath        *string         `json:"image_path" db:"image_path"`
	CapturedAt       time.Time       `json:"captured_at" db:"captured_at"`
}