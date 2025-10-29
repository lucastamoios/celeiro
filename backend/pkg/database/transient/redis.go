package database

import (
	"context"
	"fmt"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"

	"github.com/redis/go-redis/v9"
)

type RedisDB struct {
	client *redis.Client
}

func NewRedisDB(config *config.Config, logger logging.Logger) (TransientDatabase, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", config.RedisHost, config.RedisPort),
		Password: config.RedisPassword,
		DB:       config.RedisDB,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Error(context.Background(), "Failed to connect to Redis", "error", err)
		return nil, errors.Wrap(err, "failed to connect to Redis")
	}

	logger.Info(context.Background(), "Successfully connected to Redis", "host", config.RedisHost, "port", config.RedisPort)
	return &RedisDB{client: rdb}, nil
}

func (r *RedisDB) Get(ctx context.Context, key string) (string, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", errors.New("key '%s' not found", key)
	}
	if err != nil {
		return "", errors.Wrap(err, "failed to get key '%s'", key)
	}
	return val, nil
}

func (r *RedisDB) Set(ctx context.Context, key string, value string) error {
	err := r.client.Set(ctx, key, value, 0).Err()
	if err != nil {
		return errors.Wrap(err, "failed to set key '%s'", key)
	}
	return nil
}

func (r *RedisDB) SetWithExpiration(ctx context.Context, key string, value string, expiration time.Duration) error {
	err := r.client.Set(ctx, key, value, expiration).Err()
	if err != nil {
		return errors.Wrap(err, "failed to set key '%s' with expiration", key)
	}
	return nil
}

func (r *RedisDB) Delete(ctx context.Context, key string) error {
	err := r.client.Del(ctx, key).Err()
	if err != nil {
		return errors.Wrap(err, "failed to delete key '%s'", key)
	}
	return nil
}

func (r *RedisDB) Exists(ctx context.Context, key string) (bool, error) {
	count, err := r.client.Exists(ctx, key).Result()
	if err != nil {
		return false, errors.Wrap(err, "failed to check existence of key '%s'", key)
	}
	return count > 0, nil
}

func (r *RedisDB) Close() error {
	return r.client.Close()
}

func (r *RedisDB) Ping(ctx context.Context) error {
	err := r.client.Ping(ctx).Err()
	if err != nil {
		return errors.Wrap(err, "Redis ping failed")
	}
	return nil
}
