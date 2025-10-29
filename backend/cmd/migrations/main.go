package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/catrutech/celeiro/internal/migrations"

	_ "github.com/jackc/pgx/v5/stdlib" // PostgreSQL driver
	"github.com/pressly/goose/v3"
)

func main() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatalf("DATABASE_URL not set")
	}

	db, err := sql.Open("pgx", connStr)
	if err != nil {
		log.Fatalf("failed to open database connection: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping database: %v", err)
	}
	log.Println("Successfully connected to the database")

	goose.SetBaseFS(migrations.MigrationsFS)

	if err := goose.SetDialect("postgres"); err != nil {
		log.Fatalf("goose: failed to set dialect: %v", err)
	}

	if err := goose.Up(db, "."); err != nil {
		log.Fatalf("goose: failed to run migrations: %v", err)
	}

	log.Println("Migrations applied successfully")
}
