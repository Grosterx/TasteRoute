package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Store struct {
	PG    *pgxpool.Pool
	Redis *redis.Client
}

func New(ctx context.Context, databaseURL, redisURL string) (*Store, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping postgres: %w", err)
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		pool.Close()
		return nil, fmt.Errorf("parse redis url: %w", err)
	}
	rdb := redis.NewClient(opts)
	if err := rdb.Ping(ctx).Err(); err != nil {
		_ = rdb.Close()
		pool.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &Store{PG: pool, Redis: rdb}, nil
}

func (s *Store) Close() {
	if s == nil {
		return
	}
	if s.Redis != nil {
		_ = s.Redis.Close()
	}
	if s.PG != nil {
		s.PG.Close()
	}
}
