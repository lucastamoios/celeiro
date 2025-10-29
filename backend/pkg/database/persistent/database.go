package database

import (
	"context"
)

// Database abstracts the underlying database writes and reads.
type Database interface {
	// Query puts the result into dest (one or multiple, depending on the query and the dest type)
	// This writes/reads using a writable connection.
	Query(ctx context.Context, dest any, query string, args ...any) error
	// Run executes a query without returning any result.
	Run(ctx context.Context, query string, args ...any) error
	Tx(ctx context.Context, fn func(ctx context.Context) error) error
}

// Transactionable allows a repository to support transactions
// and be included in a transaction.
type Transactionable interface {
	// Tx encapsulates the creation, rollback and commit of a transaction
	Tx(ctx context.Context, fn func(ctx context.Context) error) error
}
