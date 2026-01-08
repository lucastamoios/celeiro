package database

import (
	"context"
	"database/sql"
	"log"
	"reflect"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/internal/migrations"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/pressly/goose/v3"

	_ "github.com/jackc/pgx/v5/stdlib" // Standard library bindings for pgx
	"github.com/jmoiron/sqlx"
	"github.com/uptrace/opentelemetry-go-extra/otelsql"
	"github.com/uptrace/opentelemetry-go-extra/otelsqlx"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

type (
	PostgresDatabase struct {
		DB *sqlx.DB
	}

	ctxKey int
)

const TxKey ctxKey = 0

func New(config *config.Config, logger logging.Logger) Database {
	var db PostgresDatabase
	logger.Info(
		context.Background(),
		"Connecting to database...",
		"connStr", config.PGConnStr,
		"dbName", config.PGDBName,
		"maxIdle", config.PGMaxIdle,
		"maxConn", config.PGMaxConn,
	)
	if db.tryConnect(config.PGConnStr, config.PGDBName, config.PGMaxIdle, config.PGMaxConn, logger) {
		return &db
	}
	go db.connect(config.PGConnStr, config.PGDBName, config.PGMaxIdle, config.PGMaxConn, logger)
	return &db
}

func (ps *PostgresDatabase) tryConnect(connStr, dbName string, maxIdle, maxConn int, logger logging.Logger) bool {
	conn, err := otelsqlx.Connect("pgx", connStr,
		otelsql.WithAttributes(semconv.DBSystemPostgreSQL),
		otelsql.WithDBName(dbName))
	if err == nil {
		conn.SetMaxIdleConns(maxIdle)
		conn.SetMaxOpenConns(maxConn)
		ps.DB = conn
		logger.Info(context.Background(), "Successfully connected to the database.")

		// Run migrations automatically on startup
		if err := ps.runMigrations(logger); err != nil {
			logger.Error(context.Background(), "Failed to run migrations", "error", err)
			// Don't fail startup - log the error and continue
			// This allows the app to start even if migrations have issues
		}

		return true
	}
	logger.Error(context.Background(), "Connection to db failed", "error", err)
	return false
}

// runMigrations runs all pending database migrations using goose
func (ps *PostgresDatabase) runMigrations(logger logging.Logger) error {
	logger.Info(context.Background(), "Running database migrations...")

	goose.SetBaseFS(migrations.MigrationsFS)

	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}

	if err := goose.Up(ps.DB.DB, "."); err != nil {
		return err
	}

	logger.Info(context.Background(), "Database migrations completed successfully.")

	// Direct fix for email_id - bypasses goose tracking
	// This runs every time but UPDATE is idempotent
	logger.Info(context.Background(), "Applying email_id fix...")
	_, err := ps.DB.Exec(`
		UPDATE users SET email_id = 'ofx+lucas.tamoios'
		WHERE user_id = 3 AND (email_id IS NULL OR email_id = '')
	`)
	if err != nil {
		logger.Error(context.Background(), "Failed to apply email_id fix", "error", err)
	} else {
		logger.Info(context.Background(), "email_id fix applied successfully")
	}

	return nil
}

func (ps *PostgresDatabase) connect(connStr, dbName string, maxIdle, maxConn int, logger logging.Logger) {
	for {
		if ps.tryConnect(connStr, dbName, maxIdle, maxConn, logger) {
			return
		}
		logger.Warn(context.Background(), "Retrying to connect to the database in 5 seconds...")
		time.Sleep(5 * time.Second)
	}
}

func (ps *PostgresDatabase) Run(ctx context.Context, query string, args ...any) error {
	if tx := checkTx(ctx); tx != nil {
		_, err := tx.ExecContext(ctx, query, args...)
		if err != nil {
			return errors.Wrap(NewPgDetailedError(err, query, args), "tx err")
		}
		return nil
	}
	_, err := ps.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return errors.Wrap(NewPgDetailedError(err, query, args), "db err")
	}
	return nil
}

func (ps *PostgresDatabase) Query(ctx context.Context, dest any, query string, args ...any) error {
	if !isPointer(dest) {
		return errors.New("dest interface should be a pointer")
	}

	var err error

	if tx := checkTx(ctx); tx != nil {
		if isArrayOrSlice(dest) {
			err = tx.SelectContext(ctx, dest, query, args...)
		} else {
			err = tx.GetContext(ctx, dest, query, args...)
		}
	} else {
		if isArrayOrSlice(dest) {
			err = ps.DB.SelectContext(ctx, dest, query, args...)
		} else {
			err = ps.DB.GetContext(ctx, dest, query, args...)
		}
	}

	return errors.Wrap(NewPgDetailedError(err, query, args), "db err")
}

func (ps *PostgresDatabase) Tx(ctx context.Context, fn func(ctx context.Context) error) (err error) {
	if ctx == nil {
		ctx = context.Background()
	}

	tx := checkTx(ctx)
	newTx := false
	if tx == nil {
		newTx = true
		tx, err = ps.DB.BeginTxx(ctx, nil)
		if err != nil {
			return err
		}
		defer rollbackOnPanic(tx)
	}

	ctx = context.WithValue(ctx, TxKey, tx)
	err = fn(ctx)

	if !newTx {
		return err
	}

	if err != nil {
		if rbErr := tx.Rollback(); rbErr != nil {
			return errors.Wrap(rbErr, "rollback err: %v original error: %v", rbErr, err)
		}
		return errors.Wrap(err, "tx err: %s", err.Error())
	}

	return tx.Commit()
}

// GetDB returns the underlying *sql.DB instance. It is used to run migrations in testcontainers.
func (ps *PostgresDatabase) GetDB() *sql.DB {
	return ps.DB.DB
}

func rollbackOnPanic(tx *sqlx.Tx) {
	ierr := recover()
	if ierr != nil {
		// These won't be logged in production, but they're useful for debugging
		log.Println("Panicked while running transaction: ", ierr)
		if err := tx.Rollback(); err != nil {
			log.Println("Could not rollback transaction due to: ", err, "original error: ", ierr)
		}
	}
}

func checkTx(ctx context.Context) *sqlx.Tx {
	if ctx == nil {
		return nil
	}

	v := ctx.Value(TxKey)
	if tx, ok := v.(*sqlx.Tx); ok {
		if tx != nil {
			return tx
		}
	}
	return nil
}

func isArrayOrSlice(dest any) bool {
	kind := reflect.Indirect(reflect.ValueOf(dest)).Kind()
	return kind == reflect.Slice || kind == reflect.Array
}

func isPointer(dest any) bool {
	v := reflect.ValueOf(dest)
	return v.Kind() == reflect.Ptr
}
