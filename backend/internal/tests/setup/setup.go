package testsetup

import (
	"sync"

	persistent "github.com/catrutech/celeiro/pkg/database/persistent"
	transient "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
)

var (
	dbContainer                *postgresContainer
	initDBContainerOnce        sync.Once
	transientContainer         *redisContainer
	initTransientContainerOnce sync.Once
)

// GetDB returns the initialized focus db or initialize it.
func GetDB(logger logging.Logger) persistent.Database {
	c := initDBContainer(logger)
	return c.db
}

// GetRedis returns the initialized redis or initialize it.
func GetRedis(logger logging.Logger) transient.TransientDatabase {
	c := initTransientContainer(logger)
	return c.db
}

// GetDBConfig returns the DB configurations for initialized focus db.
func GetDBConfig(logger logging.Logger) DBConnInfo {
	c := initDBContainer(logger)
	return c.config.DBConnInfo
}

// GetRedisConfig returns the Redis configurations for initialized redis.
func GetRedisConfig(logger logging.Logger) TransientConnInfo {
	c := initTransientContainer(logger)
	return c.config.TransientConnInfo
}

// initDBContainer initializes the focus db container.
func initDBContainer(logger logging.Logger) *postgresContainer {
	initDBContainerOnce.Do(func() {
		dbContainer = newDBContainer(newDBConfig(logger))
	})
	return dbContainer
}

// initRedisContainer initializes the redis container.
func initTransientContainer(logger logging.Logger) *redisContainer {
	initTransientContainerOnce.Do(func() {
		transientContainer = newTransientContainer(newTransientConfig(logger))
	})
	return transientContainer
}

// newDBConfig returns the configuration for the focus database.
func newDBConfig(logger logging.Logger) postgresContainerConfig {
	return postgresContainerConfig{
		Image:  "postgres:16",
		Logger: logger,

		DBConnInfo: DBConnInfo{
			Name:       "scaffold_db_test",
			User:       "postgres",
			Password:   "postgres",
			DisableSSL: "sslmode=disable",
		},
	}
}

func newTransientConfig(logger logging.Logger) redisContainerConfig {
	return redisContainerConfig{
		Image:  "redis:4",
		Logger: logger,
	}
}
