package config

import (
	"os"
)

type Config struct {
	Port          string
	RedisAddr     string
	RedisPassword string
}

func Load() *Config {
	return &Config{
		Port:          getEnv("PORT", "8103"),
		RedisAddr:     getEnv("REDIS_ADDR", "localhost:6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
