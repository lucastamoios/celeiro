// Package migrations embeds the SQL migration files.
package migrations

import (
	"embed"
)

// MigrationsFS holds the embedded SQL migration files.
//
//go:embed *.sql
var MigrationsFS embed.FS
