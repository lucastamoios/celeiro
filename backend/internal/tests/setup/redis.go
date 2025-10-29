package testsetup

import (
	"context"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	database "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"

	"github.com/testcontainers/testcontainers-go/modules/redis"
)

type redisContainerConfig struct {
	TransientConnInfo
	Image  string
	Logger logging.Logger
}

type TransientConnInfo struct {
	Host string
	Port string
}

// redisContainer represents the redis instance for the reports module test.
type redisContainer struct {
	config redisContainerConfig
	host   string
	db     database.TransientDatabase
}

// NewRedisContainer creates a new instance of the redis container type.
func newTransientContainer(containerConfig redisContainerConfig) *redisContainer {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()
	container := &redisContainer{
		config: containerConfig,
	}
	container.init(ctx)
	return container
}

// init initializes the redis container instance.
func (r *redisContainer) init(ctx context.Context) {
	container, err := redis.Run(ctx,
		r.config.Image,
		redis.WithSnapshotting(10, 1),
		redis.WithLogLevel(redis.LogLevelVerbose),
	)
	if err != nil {
		r.config.Logger.Error(ctx, "failed to start redis container", "error", err.Error())
	}
	r.config.Host, err = container.Host(ctx)
	if err != nil {
		r.config.Logger.Error(ctx, "failed to retrieve redis host", "error", err.Error())
	}
	port, err := container.MappedPort(ctx, "6379")
	if err != nil {
		r.config.Logger.Error(ctx, "failed to retrieve redis port", "error", err.Error())
	}
	r.config.Port = port.Port()
	cfg := &config.Config{
		RedisHost:     r.config.Host,
		RedisPort:     r.config.Port,
		RedisPassword: "",
		RedisDB:       0,
	}
	r.db, err = database.NewRedisDB(cfg, r.config.Logger)
	if err != nil {
		r.config.Logger.Error(ctx, "failed to create redis database", "error", err.Error())
	}
}
