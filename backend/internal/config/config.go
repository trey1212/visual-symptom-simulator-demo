// Package config loads server configuration from environment variables.
package config

import "os"

type Config struct {
	Addr        string // listen address, e.g. ":8080"
	DatabaseURL string // storage DSN; engine not yet decided (see DESIGN.md)
	AssetDir    string // where the scene files are (images/ and videos/)
}

func Load() Config {
	return Config{
		Addr:        getenv("ADDR", ":8080"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		AssetDir:    getenv("ASSET_DIR", "./data"),
	}
}

func getenv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok {
		return v
	}
	return fallback
}
