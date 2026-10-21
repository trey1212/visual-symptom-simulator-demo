package httpapi

import (
	"os"
	"path/filepath"
	"testing"
)

// TestSceneFilePath checks that real files are allowed and sneaky paths get blocked
func TestSceneFilePath(t *testing.T) {
	// makes a temp data folder with one real file in images/ to test against
	assetDir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(assetDir, "images"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(assetDir, "images", "park.jpg"), []byte("test"), 0o644); err != nil {
		t.Fatal(err)
	}

	tests := []struct {
		name      string
		assetPath string
		wantOK    bool
	}{
		{"real file", "images/park.jpg", true},
		{"missing file", "images/missing.jpg", false},
		{"folder instead of a file", "images", false},
		{"tries to leave the folder", "../.env", false},
		{"sneaky way to leave the folder", "images/../../.env", false},
		{"absolute path", "/etc/passwd", false},
		{"empty path", "", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			_, ok := sceneFilePath(assetDir, tc.assetPath)
			if ok != tc.wantOK {
				t.Errorf("sceneFilePath(%q) ok = %v, want %v", tc.assetPath, ok, tc.wantOK)
			}
		})
	}
}
