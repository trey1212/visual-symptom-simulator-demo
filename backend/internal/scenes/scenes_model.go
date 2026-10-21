package scenes

import (
	"time"

	"github.com/google/uuid"
)

type Scene struct {
	ID        uuid.UUID `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Type      string    `json:"type" db:"type"`
	AssetPath string    `json:"asset_path" db:"asset_path"`
	IsActive  bool      `json:"is_active" db:"is_active"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}