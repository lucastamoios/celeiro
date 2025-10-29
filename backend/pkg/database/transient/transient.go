package database

import (
	"context"
	"time"
)

type TransientDatabase interface {
	Get(ctx context.Context, key string) (string, error)

	Set(ctx context.Context, key string, value string) error

	SetWithExpiration(ctx context.Context, key string, value string, expiration time.Duration) error

	Delete(ctx context.Context, key string) error

	Exists(ctx context.Context, key string) (bool, error)

	Close() error

	Ping(ctx context.Context) error
}
